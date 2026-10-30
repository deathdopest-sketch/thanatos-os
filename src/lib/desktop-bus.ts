import { create } from 'zustand';

// Lets any app, the console, or the desktop's right-click menu ask the desktop
// to open an app (or a particular Settings tab) without threading callbacks
// through every window.

type DesktopBus = {
  appRequest: { id: string; n: number } | null;
  settingsTab: string | null;
  openApp: (id: string) => void;
  openSettings: (tab: string) => void;
  takeSettingsTab: () => string | null;
};

export const useDesktopBus = create<DesktopBus>((set, get) => ({
  appRequest: null,
  settingsTab: null,
  openApp: (id) => set((s) => ({ appRequest: { id, n: (s.appRequest?.n ?? 0) + 1 } })),
  openSettings: (tab) => { set({ settingsTab: tab }); get().openApp('settings'); },
  takeSettingsTab: () => { const t = get().settingsTab; if (t) set({ settingsTab: null }); return t; }
}));
