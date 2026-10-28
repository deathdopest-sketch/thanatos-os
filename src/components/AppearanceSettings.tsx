import { useRef, useState, type ChangeEvent } from 'react';
import { Check, ImagePlus, Link2, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import clsx from 'clsx';
import {
  EFFECTS, mediaKindOf, useAppearance, useMediaUrl,
  type ColorKey, type MediaItem
} from '../lib/appearance';
import { BackgroundMedia } from './CustomBackground';

type BuiltIn = { id: string; label: string; swatch: [string, string] };

const COLORS: { key: ColorKey; label: string; fallback: string }[] = [
  { key: 'primary', label: 'Main colour', fallback: '#ff2360' },
  { key: 'accent', label: 'Second colour', fallback: '#8e1cff' },
  { key: 'text', label: 'Text', fallback: '#f7eee9' },
  { key: 'base', label: 'Background', fallback: '#040106' }
];

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

export type AppearanceSection = 'theme' | 'background' | 'colours' | 'effects';

export default function AppearanceSettings({ section, theme, themes, onThemeChange }: { section: AppearanceSection; theme: string; themes: BuiltIn[]; onThemeChange: (t: string) => void }) {
  const s = useAppearance();
  const { appearance: a } = s;
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [themeName, setThemeName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 3500); };

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      let last: MediaItem | null = null;
      for (const f of files) last = await s.addMedia(f);
      if (last) s.update({ background: { kind: 'media', mediaId: last.id } });
      flash(files.length > 1 ? `Added ${files.length} files.` : 'Background set.');
    } catch (err) {
      flash((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) { flash('Paste a link starting with http:// or https://'); return; }
    const kind = mediaKindOf('', new URL(u).pathname) ?? 'image';
    s.update({ background: { kind: 'url', url: u, media: kind } });
    setUrl('');
    flash('Background set from link.');
  };

  const bgActive = (id: string) => a.background.kind === 'media' && a.background.mediaId === id;

  return (
    <div className="appearance">
      {msg ? <p className="appearance-msg" role="status">{msg}</p> : null}

      {section === 'theme' ? (
      <section>
        <h3>Theme</h3>
        <div className="appearance-themes">
          {themes.map((t) => (
            <button key={t.id} type="button" className={clsx(theme === t.id && 'selected')} onClick={() => onThemeChange(t.id)}>
              <span className="swatch" style={{ background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }} />
              {t.label}
            </button>
          ))}
        </div>
        {s.themes.length ? (
          <>
            <h4>Your themes</h4>
            <ul className="appearance-saved">
              {s.themes.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => { onThemeChange(t.base); s.update(structuredClone(t.appearance)); flash(`${t.name} applied.`); }}>
                    <Check size={14} /> {t.name}
                  </button>
                  <button type="button" aria-label={`Delete ${t.name}`} onClick={() => s.deleteTheme(t.id)}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <div className="appearance-row">
          <input value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="Name this look…" aria-label="Theme name"
            onKeyDown={(e) => { if (e.key === 'Enter') { s.saveTheme(themeName, theme); setThemeName(''); flash('Theme saved.'); } }} />
          <button type="button" onClick={() => { s.saveTheme(themeName, theme); setThemeName(''); flash('Theme saved.'); }}><Save size={14} /> Save as theme</button>
        </div>
        <p className="appearance-hint">Saves your background, colours and effects together, so you can switch between looks in one click.</p>
      </section>
      ) : null}

      {section === 'background' ? (
      <section>
        <h3>Background</h3>
        <div className="appearance-media">
          <button type="button" className={clsx('media-tile theme-art', a.background.kind === 'theme' && 'selected')} onClick={() => s.update({ background: { kind: 'theme' } })}>
            <span>Theme art</span>
          </button>
          {s.media.map((m) => (
            <MediaTile key={m.id} item={m} selected={bgActive(m.id)} onPick={() => s.update({ background: { kind: 'media', mediaId: m.id } })} onDelete={() => void s.removeMedia(m.id)} />
          ))}
          <button type="button" className="media-tile add" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <span>Saving…</span> : <><ImagePlus size={20} /><span>Add picture, GIF or video</span></>}
          </button>
          <input ref={fileRef} type="file" hidden multiple accept="image/*,video/*,.gif" onChange={onFiles} />
        </div>
        <div className="appearance-row">
          <Link2 size={15} />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste a link to an image, GIF or video" aria-label="Background link"
            onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); }} />
          <button type="button" onClick={applyUrl}><Upload size={14} /> Use link</button>
        </div>
        {a.background.kind === 'url' ? <p className="appearance-hint">Using a link: {a.background.url}</p> : null}

        <div className="appearance-controls">
          <label>
            Fit
            <select value={a.fit} onChange={(e) => s.update({ fit: e.target.value as typeof a.fit })}>
              <option value="cover">Fill the screen</option>
              <option value="contain">Show it whole</option>
              <option value="tile">Tile (pictures)</option>
            </select>
          </label>
          <label>
            Darken <span>{Math.round(a.dim * 100)}%</span>
            <input type="range" min={0} max={85} value={Math.round(a.dim * 100)} onChange={(e) => s.update({ dim: Number(e.target.value) / 100 })} />
          </label>
          <label>
            Blur <span>{a.blur}px</span>
            <input type="range" min={0} max={20} value={a.blur} onChange={(e) => s.update({ blur: Number(e.target.value) })} />
          </label>
        </div>
        <p className="appearance-hint">Uploads stay on this device. Up to 150 MB each. Videos play muted and on a loop.</p>
      </section>
      ) : null}

      {section === 'colours' ? (
      <section>
        <h3>Colours</h3>
        <div className="appearance-colors">
          {COLORS.map((c) => (
            <div key={c.key} className="appearance-color">
              <label>
                <input type="color" value={a.colors[c.key] ?? c.fallback} onChange={(e) => s.setColor(c.key, e.target.value)} />
                <span>{c.label}<small>{a.colors[c.key] ?? 'theme default'}</small></span>
              </label>
              {a.colors[c.key] ? <button type="button" aria-label={`Reset ${c.label}`} title="Back to the theme's colour" onClick={() => s.setColor(c.key, null)}><RotateCcw size={13} /></button> : null}
            </div>
          ))}
        </div>
        <p className="appearance-hint">Colours apply on top of the theme. Main colour drives borders, glows and highlights everywhere.</p>
      </section>
      ) : null}

      {section === 'effects' ? (
      <section>
        <h3>Effects</h3>
        <div className="appearance-effects">
          {EFFECTS.map((e) => (
            <label key={e.key} title={e.hint}>
              <input type="checkbox" checked={a.effects[e.key]} onChange={(ev) => s.setEffect(e.key, ev.target.checked)} />
              <span>{e.label}<small>{e.hint}</small></span>
            </label>
          ))}
        </div>
        <div className="appearance-controls">
          <label>
            Effect strength <span>{Math.round(a.intensity * 100)}%</span>
            <input type="range" min={10} max={100} value={Math.round(a.intensity * 100)} onChange={(e) => s.update({ intensity: Number(e.target.value) / 100 })} />
          </label>
        </div>
      </section>
      ) : null}

      {section === 'theme' ? <section className="appearance-reset">
        <button type="button" onClick={() => { s.reset(); flash('Back to the theme defaults. Your uploads and saved themes are kept.'); }}>
          <RotateCcw size={14} /> Reset look to defaults
        </button>
      </section> : null}
    </div>
  );
}

function MediaTile({ item, selected, onPick, onDelete }: { item: MediaItem; selected: boolean; onPick: () => void; onDelete: () => void }) {
  const src = useMediaUrl(item.id);
  return (
    <div className={clsx('media-tile', selected && 'selected')}>
      <button type="button" className="media-pick" onClick={onPick} title={`${item.name} (${mb(item.size)})`}>
        {src ? <BackgroundMedia src={src} kind={item.kind} appearance={{ fit: 'cover', dim: 0, blur: 0 }} preview /> : null}
        <span>{item.kind === 'video' ? '▶ ' : ''}{item.name}</span>
      </button>
      <button type="button" className="media-del" aria-label={`Delete ${item.name}`} onClick={onDelete}><Trash2 size={13} /></button>
    </div>
  );
}
