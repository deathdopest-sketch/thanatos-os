import { createStore, del, entries, get, set } from 'idb-keyval';

export type VfsNodeKind = 'file' | 'directory';

export type VfsNode = {
  path: string;
  name: string;
  parentPath: string;
  kind: VfsNodeKind;
  mimeType: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  content?: string;
};

export type VfsListing = {
  path: string;
  directories: VfsNode[];
  files: VfsNode[];
};

const store = createStore('thanatos-os', 'vfs');
const keyPrefix = 'node:';

export class VfsError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_PATH' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'NOT_DIRECTORY' | 'NOT_FILE'
  ) {
    super(message);
    this.name = 'VfsError';
  }
}

function assertSafeSegment(segment: string) {
  if (!segment || segment === '.' || segment === '..' || segment.includes('\0')) {
    throw new VfsError(`Invalid path segment: ${segment}`, 'INVALID_PATH');
  }
}

export function normalizePath(input: string) {
  const raw = input.trim().replaceAll('\\', '/');
  if (!raw) {
    return '/';
  }

  const parts = raw
    .split('/')
    .filter(Boolean)
    .map((part) => {
      assertSafeSegment(part);
      return part;
    });

  return `/${parts.join('/')}`;
}

function parentPathOf(path: string) {
  if (path === '/') {
    return '/';
  }

  const index = path.lastIndexOf('/');
  return index <= 0 ? '/' : path.slice(0, index);
}

function nameOf(path: string) {
  if (path === '/') {
    return '/';
  }

  return path.slice(path.lastIndexOf('/') + 1);
}

function nodeKey(path: string) {
  return `${keyPrefix}${normalizePath(path)}`;
}

async function readNode(path: string) {
  return get<VfsNode>(nodeKey(path), store);
}

async function writeNode(node: VfsNode) {
  await set(nodeKey(node.path), node, store);
}

async function ensureDirectory(path: string) {
  const node = await readNode(path);
  if (!node) {
    throw new VfsError(`Directory not found: ${path}`, 'NOT_FOUND');
  }
  if (node.kind !== 'directory') {
    throw new VfsError(`Path is not a directory: ${path}`, 'NOT_DIRECTORY');
  }
  return node;
}

export async function initializeVfs() {
  const existingRoot = await readNode('/');
  if (existingRoot) {
    return;
  }

  const now = Date.now();
  await writeNode({
    path: '/',
    name: '/',
    parentPath: '/',
    kind: 'directory',
    mimeType: 'inode/directory',
    size: 0,
    createdAt: now,
    updatedAt: now
  });

  await createDirectory('/home');
  await createDirectory('/home/death');
  await createDirectory('/home/death/projects');
  await createDirectory('/home/death/vault');
  await createDirectory('/home/death/media');
  await writeFile(
    '/home/death/readme.md',
    '# Thanatos OS\n\nPersistent browser VFS is online. Files created by apps can now survive refreshes.\n',
    'text/markdown'
  );
}

export async function createDirectory(inputPath: string) {
  const path = normalizePath(inputPath);
  const existing = await readNode(path);
  if (existing) {
    if (existing.kind === 'directory') {
      return existing;
    }
    throw new VfsError(`File already exists at directory path: ${path}`, 'ALREADY_EXISTS');
  }

  const parentPath = parentPathOf(path);
  await ensureDirectory(parentPath);

  const now = Date.now();
  const node: VfsNode = {
    path,
    name: nameOf(path),
    parentPath,
    kind: 'directory',
    mimeType: 'inode/directory',
    size: 0,
    createdAt: now,
    updatedAt: now
  };
  await writeNode(node);
  return node;
}

export async function writeFile(inputPath: string, content: string, mimeType = 'text/plain') {
  const path = normalizePath(inputPath);
  const parentPath = parentPathOf(path);
  await ensureDirectory(parentPath);

  const existing = await readNode(path);
  if (existing?.kind === 'directory') {
    throw new VfsError(`Cannot overwrite directory with file: ${path}`, 'ALREADY_EXISTS');
  }

  const now = Date.now();
  const node: VfsNode = {
    path,
    name: nameOf(path),
    parentPath,
    kind: 'file',
    mimeType,
    size: new Blob([content]).size,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    content
  };
  await writeNode(node);
  return node;
}

export async function readFile(inputPath: string) {
  const path = normalizePath(inputPath);
  const node = await readNode(path);
  if (!node) {
    throw new VfsError(`File not found: ${path}`, 'NOT_FOUND');
  }
  if (node.kind !== 'file') {
    throw new VfsError(`Path is not a file: ${path}`, 'NOT_FILE');
  }
  return node;
}

export async function listDirectory(inputPath: string): Promise<VfsListing> {
  const path = normalizePath(inputPath);
  await ensureDirectory(path);
  const allEntries = await entries<string, VfsNode>(store);
  const children = allEntries
    .map(([, value]) => value)
    .filter((node) => node.parentPath === path && node.path !== path)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    path,
    directories: children.filter((node) => node.kind === 'directory'),
    files: children.filter((node) => node.kind === 'file')
  };
}

export async function deleteNode(inputPath: string) {
  const path = normalizePath(inputPath);
  if (path === '/') {
    throw new VfsError('Root directory cannot be deleted.', 'INVALID_PATH');
  }

  const node = await readNode(path);
  if (!node) {
    throw new VfsError(`Path not found: ${path}`, 'NOT_FOUND');
  }

  const allEntries = await entries<string, VfsNode>(store);
  const descendantKeys = allEntries
    .filter(([, value]) => value.path === path || value.path.startsWith(`${path}/`))
    .map(([key]) => key);

  await Promise.all(descendantKeys.map((key) => del(key, store)));
}
