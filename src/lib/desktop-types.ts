import type { ThanatosApp } from '../apps';

export type OpenWindow = {
  id: string;
  app: ThanatosApp;
  z: number;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VaultEntry = {
  id: string;
  service: string;
  email: string;
  username: string;
  password: string;
  createdAt: string;
};

export type AccessUser = {
  usernameHash: string;
  displayName: string;
  status: 'pending' | 'active';
  recoveryHash?: string;
  recoverySalt?: string;
  pendingWrappedVaultKey?: EncryptedPayload;
  salt?: string;
  verifier?: string;
  wrappedVaultKey?: EncryptedPayload;
};

export type AccessStore = {
  version: 1;
  ownerSalt?: string;
  ownerVerifier?: string;
  users: AccessUser[];
};

export type AccessInvite = {
  version: 1;
  kind: 'thanatos.pending-user';
  createdAt: string;
  user: AccessUser;
};

export type EncryptedPayload = {
  iv: string;
  data: string;
};

export type AccessSession = {
  username: string;
  vaultKey: CryptoKey;
  startedAt: number;
};

export type MusicTrack = {
  id: string;
  name: string;
  type: string;
  blob: Blob;
};

export type MusicTrackView = MusicTrack & {
  url: string;
};

export type ThanatosTheme = 'lilly' | 'lilly-garden' | 'death' | 'zombitious';

export type PingPoint = { t: string; ms: number };

export type WeatherData = { temp: number; desc: string; wind: number };

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type BridgeMsg = { type: string; payload?: unknown };

export type MumbleChatStats = {
  loggedIn: boolean | null; userId: number | null; username: string | null; displayName: string | null;
  avatarUrl: string | null; unreadPms: number | null; onlineFriends: string[]; offlineFriends: string[];
  totalFriends: number | null; lastUpdated: string | null; status: 'idle' | 'checking' | 'online' | 'unavailable' | 'blocked'; message: string;
};

export type MumbleChatPayload = {
  type?: string; loggedIn?: unknown; userId?: unknown; username?: unknown; displayName?: unknown;
  avatarUrl?: unknown; unreadPms?: unknown; onlineFriends?: unknown; offlineFriends?: unknown; totalFriends?: unknown;
  pets?: unknown;
};

export type AudioPulse = {
  level: number;
  bass: number;
  mid: number;
  bands: number[];
  source: 'music' | 'capture' | 'idle';
};
