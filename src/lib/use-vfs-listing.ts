import { useCallback, useEffect, useState } from 'react';
import { createDirectory, initializeVfs, listDirectory, readFile, writeFile, type VfsListing, type VfsNode } from './vfs';

export function useVfsListing(initialPath = '/home/death') {
  const [cwd, setCwd] = useState(initialPath);
  const [listing, setListing] = useState<VfsListing | null>(null);
  const [selectedFile, setSelectedFile] = useState<VfsNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadListing = useCallback(async (path: string) => {
    try {
      await initializeVfs();
      const nextListing = await listDirectory(path);
      setListing(nextListing);
      setCwd(nextListing.path);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'VFS operation failed.');
    }
  }, []);

  useEffect(() => {
    void loadListing(initialPath);
  }, [initialPath, loadListing]);

  const openDirectory = useCallback(
    async (path: string) => {
      await loadListing(path);
      setSelectedFile(null);
    },
    [loadListing]
  );

  const openFile = useCallback(async (path: string) => {
    try {
      const file = await readFile(path);
      setSelectedFile(file);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open file.');
    }
  }, []);

  const createDemoFile = useCallback(async () => {
    try {
      const stamp = new Date().toISOString().replaceAll(':', '-');
      await writeFile(`${cwd}/note-${stamp}.md`, `# Thanatos Note\n\nCreated at ${stamp}.\n`, 'text/markdown');
      await loadListing(cwd);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create file.');
    }
  }, [cwd, loadListing]);

  const createFolder = useCallback(async () => {
    try {
      const stamp = Date.now().toString(36);
      await createDirectory(`${cwd}/folder-${stamp}`);
      await loadListing(cwd);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create folder.');
    }
  }, [cwd, loadListing]);

  return {
    cwd,
    listing,
    selectedFile,
    error,
    refresh: () => loadListing(cwd),
    openDirectory,
    openFile,
    createDemoFile,
    createFolder
  };
}
