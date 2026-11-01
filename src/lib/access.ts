import { readStoredValue, writeStoredValue } from './storage';
import type { AccessStore, AccessUser, AccessInvite, EncryptedPayload, VaultEntry } from './desktop-types';

export const ACCESS_KEY = 'thanatos.access.v1';
export const LEGACY_VAULT_KEY = 'thanatos.accountVault';
export const SECURE_VAULT_KEY = 'thanatos.accountVault.secure.v1';

export function randomToken(length: number, alphabet = 'abcdefghijkmnopqrstuvwxyz23456789') {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

export function bytesToB64(bytes: Uint8Array) {
  let bin = '';
  bytes.forEach((byte) => { bin += String.fromCharCode(byte); });
  return btoa(bin);
}

export function b64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function b64UrlEncode(value: string) {
  return bytesToB64(textEncoder.encode(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function b64UrlDecode(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return textDecoder.decode(b64ToBytes(padded));
}

export function exactBuffer(bytes: Uint8Array) {
  return bytes.slice().buffer as ArrayBuffer;
}

export function randomB64(bytes = 16) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return bytesToB64(values);
}

export async function sha256(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return bytesToB64(new Uint8Array(hash));
}

export async function derivePassKey(password: string, saltB64: string) {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: 250_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function keyVerifier(key: CryptoKey) {
  const raw = await crypto.subtle.exportKey('raw', key);
  const hash = await crypto.subtle.digest('SHA-256', raw);
  return bytesToB64(new Uint8Array(hash));
}

export async function encryptBytes(key: CryptoKey, bytes: Uint8Array): Promise<EncryptedPayload> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: exactBuffer(iv) }, key, exactBuffer(bytes));
  return { iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(data)) };
}

export async function decryptBytes(key: CryptoKey, payload: EncryptedPayload) {
  const data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: exactBuffer(b64ToBytes(payload.iv)) }, key, exactBuffer(b64ToBytes(payload.data)));
  return new Uint8Array(data);
}

export async function encryptJson(key: CryptoKey, value: unknown) {
  return encryptBytes(key, textEncoder.encode(JSON.stringify(value)));
}

export async function decryptJson<T>(key: CryptoKey, payload: EncryptedPayload) {
  return JSON.parse(textDecoder.decode(await decryptBytes(key, payload))) as T;
}

export async function generateVaultKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function wrapVaultKey(userKey: CryptoKey, vaultKey: CryptoKey) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', vaultKey));
  return encryptBytes(userKey, raw);
}

export async function unwrapVaultKey(userKey: CryptoKey, payload: EncryptedPayload) {
  const raw = await decryptBytes(userKey, payload);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export function readAccessStore(): AccessStore {
  try {
    const parsed = JSON.parse(readStoredValue(ACCESS_KEY) ?? '') as AccessStore;
    return parsed?.version === 1 && Array.isArray(parsed.users) ? parsed : { version: 1, users: [] };
  } catch {
    return { version: 1, users: [] };
  }
}

export function writeAccessStore(store: AccessStore) {
  writeStoredValue(ACCESS_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('thanatos:access-store'));
}

export function makeAccessInvite(user: AccessUser) {
  const invite: AccessInvite = {
    version: 1,
    kind: 'thanatos.pending-user',
    createdAt: new Date().toISOString(),
    user
  };
  return `thanatos_invite_${b64UrlEncode(JSON.stringify(invite))}`;
}

export function readAccessInvite(code: string): AccessInvite {
  const trimmed = code.trim();
  if (!trimmed.startsWith('thanatos_invite_')) throw new Error('Invalid invite prefix');
  const parsed = JSON.parse(b64UrlDecode(trimmed.slice('thanatos_invite_'.length))) as AccessInvite;
  if (parsed.version !== 1 || parsed.kind !== 'thanatos.pending-user' || parsed.user?.status !== 'pending') {
    throw new Error('Invalid invite payload');
  }
  if (!parsed.user.usernameHash || !parsed.user.displayName || !parsed.user.recoveryHash || !parsed.user.recoverySalt || !parsed.user.pendingWrappedVaultKey) {
    throw new Error('Incomplete invite payload');
  }
  return parsed;
}

export function importAccessInvite(code: string) {
  const invite = readAccessInvite(code);
  const store = readAccessStore();
  const existing = store.users.find((user) => user.usernameHash === invite.user.usernameHash);
  if (existing?.status === 'active') return { status: 'active' as const, username: existing.displayName };
  if (existing?.status === 'pending') {
    Object.assign(existing, invite.user);
  } else {
    store.users.push(invite.user);
  }
  writeAccessStore(store);
  return { status: 'pending' as const, username: invite.user.displayName };
}

export async function readVault(vaultKey: CryptoKey): Promise<VaultEntry[]> {
  const secure = readStoredValue(SECURE_VAULT_KEY);
  if (!secure) return [];
  return decryptJson<VaultEntry[]>(vaultKey, JSON.parse(secure) as EncryptedPayload);
}

export async function writeVault(vaultKey: CryptoKey, entries: VaultEntry[]) {
  writeStoredValue(SECURE_VAULT_KEY, JSON.stringify(await encryptJson(vaultKey, entries)));
  window.dispatchEvent(new CustomEvent('thanatos:vault-updated'));
}

export function readLegacyVault() {
  try {
    return JSON.parse(readStoredValue(LEGACY_VAULT_KEY) ?? '[]') as VaultEntry[];
  } catch {
    return [];
  }
}

export async function ensureVaultInitialized(vaultKey: CryptoKey) {
  if (readStoredValue(SECURE_VAULT_KEY)) return;
  const legacy = readLegacyVault();
  await writeVault(vaultKey, legacy);
  if (legacy.length) localStorage.removeItem(LEGACY_VAULT_KEY);
}

export function normalizeUser(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
}

export async function makeUserHash(username: string) {
  return sha256(`user:${normalizeUser(username)}`);
}
