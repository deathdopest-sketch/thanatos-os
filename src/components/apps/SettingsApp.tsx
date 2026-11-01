import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useDesktopBus } from '../../lib/desktop-bus';
import AppearanceSettings, { type AppearanceSection } from '../AppearanceSettings';
import type { ThanatosTheme } from '../../lib/desktop-types';

export const BUILT_IN_THEMES: { id: ThanatosTheme; label: string; swatch: [string, string] }[] = [
  { id: 'lilly', label: 'Lilly', swatch: ['#ff2360', '#8e1cff'] },
  { id: 'lilly-garden', label: "Lilly's Garden", swatch: ['#7cff76', '#ff8722'] },
  { id: 'death', label: 'Death', swatch: ['#ff122a', '#780012'] },
  { id: 'zombitious', label: 'zomBitious', swatch: ['#78ff78', '#ff2252'] }
];

const SETTINGS_TABS: { id: AppearanceSection | 'system'; label: string }[] = [
  { id: 'theme', label: 'Theme' },
  { id: 'background', label: 'Background' },
  { id: 'colours', label: 'Colours' },
  { id: 'effects', label: 'Effects' },
  { id: 'system', label: 'System' }
];

export function SettingsApp({ theme, onThemeChange }: { theme: ThanatosTheme; onThemeChange: (t: ThanatosTheme) => void }) {
  const isTab = (t: string | null): t is AppearanceSection | 'system' => SETTINGS_TABS.some((x) => x.id === t);
  const [tab, setTab] = useState<AppearanceSection | 'system'>(() => { const t = useDesktopBus.getState().takeSettingsTab(); return isTab(t) ? t : 'theme'; });
  // e.g. "Change background…" from the desktop menu while Settings is already open
  const requested = useDesktopBus((st) => st.settingsTab);
  useEffect(() => { if (requested) { const t = useDesktopBus.getState().takeSettingsTab(); if (isTab(t)) setTab(t); } }, [requested]);
  return (
    <div className="settings-app">
      <nav className="settings-sidebar" aria-label="Settings sections">
        {SETTINGS_TABS.map((t) => (
          <button key={t.id} type="button" className={clsx('settings-nav-item', tab === t.id && 'active')} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </nav>
      <div className="settings-content">
        {tab === 'system' ? (
          <section className="settings-note">
            <h3>Remote Control</h3>
            <p>Developer → Remote Control to pair via bridge daemon over Tailscale.</p>
          </section>
        ) : (
          <AppearanceSettings section={tab} theme={theme} themes={BUILT_IN_THEMES}
            onThemeChange={(t) => { const found = BUILT_IN_THEMES.find((b) => b.id === t); if (found) onThemeChange(found.id); }} />
        )}
      </div>
    </div>
  );
}
