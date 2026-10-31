import { useEffect, useRef, useState } from 'react';
import { Skull } from 'lucide-react';
import clsx from 'clsx';
import { PetSprite } from '../lib/pet-sprite';
import { useRotvicePets } from '../lib/rotvice-pets';

const SIZE = 96;

const IDLE_LINES = [
  'quiet in the rot.',
  'the dead are watching.',
  'waiting for a raid.',
  '...',
  'something stirs.',
  'your pets are hungry.',
  'all is still.',
  'who disturbs the rot?',
];

/** Draggable always-on companion that shows your active RotVice pet.
 *  Reacts to raids, friend-online events, and battle challenges.
 *  Falls back to a skull when RotVice is not open or not logged in. */
export function RotViceCompanion() {
  const pets     = useRotvicePets((s) => s.pets);
  const loggedIn = useRotvicePets((s) => s.loggedIn);
  const alerts   = useRotvicePets((s) => s.alerts);
  const clearAlert = useRotvicePets((s) => s.clearAlert);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<PetSprite | null>(null);
  const bodyRef   = useRef<HTMLDivElement>(null);
  const drag      = useRef<{ dx: number; dy: number } | null>(null);

  const [pos, setPos] = useState({ x: -1, y: -1 });   // -1 = default position
  const [bubble, setBubble] = useState<string | null>(null);

  const activePet  = pets[0] ?? null;
  const online     = !!loggedIn && activePet !== null;
  const spriteKey  = activePet ? `${JSON.stringify(activePet.sprite)}|${activePet.spriteUrl}` : '';

  // ── sprite ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!online || !activePet) {
      if (spriteRef.current) { spriteRef.current.stop(); spriteRef.current = null; }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(143,133,125,.45)';
        ctx.font = `${Math.round(canvas.height * 0.5)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☠', canvas.width / 2, canvas.height / 2);
      }
      return;
    }

    const sprite = new PetSprite(canvas, activePet.sprite, activePet.spriteUrl);
    spriteRef.current = sprite;
    return () => { sprite.stop(); spriteRef.current = null; };
  // spriteKey and online are the only things that should restart the sprite
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spriteKey, online]);

  // ── bubble ───────────────────────────────────────────────────
  const sayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function say(text: string, anim?: 'action' | 'react' | 'happy') {
    if (sayRef.current) clearTimeout(sayRef.current);
    setBubble(text);
    if (anim && spriteRef.current) spriteRef.current.play(anim);
    sayRef.current = setTimeout(() => { setBubble(null); clearAlert(); }, 5000);
  }

  // Show newest alert whenever the list changes
  useEffect(() => {
    if (alerts.length === 0) return;
    const a = alerts[0];
    say(a.text, a.anim as 'action' | 'react' | 'happy' | undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts]);

  // Idle chatter
  useEffect(() => {
    const t = setInterval(() => {
      if (!online || alerts.length > 0 || bubble) return;
      if (Math.random() < 0.25) say(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)]);
    }, 28_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // ── drag ─────────────────────────────────────────────────────
  const startDrag = (e: React.PointerEvent) => {
    const body = bodyRef.current;
    if (!body || (e.target as HTMLElement).closest('button')) return;
    const rect = body.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    body.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
  };
  const endDrag = () => { drag.current = null; };

  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cx = pos.x < 0 ? w - SIZE - 24 : Math.max(0, Math.min(pos.x, w - SIZE));
  const cy = pos.y < 0 ? h - SIZE - 60 : Math.max(0, Math.min(pos.y, h - SIZE - 8));

  return (
    <div
      ref={bodyRef}
      className={clsx('rv-companion', !online && 'offline')}
      style={{ left: cx, top: cy }}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      title={online ? `${activePet.name} · lv ${activePet.level}` : 'open RotVice to connect'}
    >
      {bubble ? <div className="rv-companion-bubble">{bubble}</div> : null}

      <canvas
        ref={canvasRef}
        width={SIZE * 2}
        height={SIZE * 2}
        style={{ width: SIZE, height: SIZE }}
      />

      <div className="rv-companion-footer">
        {online
          ? <><i className="rv-companion-dot on" /><span>{activePet.name}</span></>
          : <><Skull size={10} /><span>{loggedIn === false ? 'log in to RotVice' : 'open RotVice'}</span></>
        }
      </div>
    </div>
  );
}
