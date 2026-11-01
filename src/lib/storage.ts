export const WINDOW_STATE_KEY = 'thanatos.windowState.v1';

export function readStoredValue(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Thanatos still works when browser storage is blocked.
  }
}

export const cp = (text: string) => void navigator.clipboard.writeText(text);
