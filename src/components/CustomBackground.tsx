import { useAppearance, useMediaUrl, type Appearance } from '../lib/appearance';

// Your picture, GIF or video behind the desktop, with optional blur and dimming.
export default function CustomBackground() {
  const appearance = useAppearance((s) => s.appearance);
  const media = useAppearance((s) => s.media);
  const bg = appearance.background;
  const uploaded = bg.kind === 'media' ? media.find((m) => m.id === bg.mediaId) : undefined;
  const blobUrl = useMediaUrl(uploaded?.id ?? null);

  if (bg.kind === 'theme') return null;
  const src = bg.kind === 'url' ? bg.url : blobUrl;
  const kind = bg.kind === 'url' ? bg.media : uploaded?.kind;
  if (!src || !kind) return null;
  return <BackgroundMedia src={src} kind={kind} appearance={appearance} />;
}

export function BackgroundMedia({ src, kind, appearance, preview = false }: { src: string; kind: 'image' | 'video'; appearance: Pick<Appearance, 'fit' | 'dim' | 'blur'>; preview?: boolean }) {
  const { fit, dim, blur } = appearance;
  const filter = blur ? `blur(${preview ? blur / 4 : blur}px)` : undefined;
  // a slight zoom hides the soft edges blur leaves
  const transform = blur ? 'scale(1.06)' : undefined;
  return (
    <div className={preview ? 'custom-bg preview' : 'custom-bg'} aria-hidden="true">
      {kind === 'video' ? (
        // previews show a still frame; only the real background plays
        <video src={preview ? `${src}#t=0.5` : src} autoPlay={!preview} muted loop={!preview} playsInline preload={preview ? 'metadata' : 'auto'}
          style={{ objectFit: fit === 'contain' ? 'contain' : 'cover', filter, transform }} />
      ) : fit === 'tile' ? (
        <div className="custom-bg-tile" style={{ backgroundImage: `url("${src.replace(/"/g, '%22')}")`, filter, transform }} />
      ) : (
        <img src={src} alt="" referrerPolicy="no-referrer" style={{ objectFit: fit, filter, transform }} />
      )}
      <div className="custom-bg-dim" style={{ opacity: dim }} />
    </div>
  );
}
