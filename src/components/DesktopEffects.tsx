import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { AnimatePresence, motion } from 'framer-motion';
import { Skull } from 'lucide-react';
import { nanoid } from 'nanoid';

const QUOTES = [
  'EVERY PROCESS ENDS.', 'THE KERNEL REMEMBERS THE DEAD.', 'ALL WINDOWS CLOSE EVENTUALLY.',
  'ROOT WAITS BELOW.', 'THE MACHINE BLEEDS IN SILENCE.', 'NO DAEMON ESCAPES THE REAPER.',
  'YOUR SESSION HAS A GRAVE.', 'ASH IS JUST MEMORY WITH THE LIGHT REMOVED.',
  'DEATH IS THE ONLY ROOT ACCESS.', 'NULL POINTER TO THE VOID.',
  'SEGMENTATION FAULT IN YOUR SOUL.', 'EVEN THE CPU GROWS COLD.'
];

export function AshField() {
  const positions = useMemo(() => {
    const pts = new Float32Array(900 * 3);
    for (let i = 0; i < pts.length; i += 3) {
      pts[i] = (Math.random() - 0.5) * 28;
      pts[i + 1] = (Math.random() - 0.5) * 18;
      pts[i + 2] = (Math.random() - 0.5) * 18;
    }
    return pts;
  }, []);
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color="#ff174d" size={0.038} transparent opacity={0.52} blending={2} depthWrite={false} />
    </points>
  );
}

export function BootLayer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; onDone(); } };
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });
    const fb = window.setTimeout(finish, 1900);
    tl.fromTo('.boot-sigil', { rotate: -18, scale: 0.7, opacity: 0 }, { rotate: 0, scale: 1, opacity: 1, duration: 0.5 })
      .fromTo('.boot-glyph', { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.035, duration: 0.45 }, '-=0.18')
      .to('.boot-panel', { opacity: 0, scale: 1.04, duration: 0.55, delay: 0.4 });
    return () => { window.clearTimeout(fb); tl.kill(); };
  }, [onDone]);
  return (
    <div className="boot-panel">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}><AshField /></Canvas>
      <div className="boot-sprite" aria-hidden="true" />
      <div className="boot-mark" aria-label="Thanatos OS booting">
        <Skull className="boot-sigil" size={86} />
        <div>{'THANATOS OS'.split('').map((c, i) => <span className="boot-glyph" key={`${c}-${i}`}>{c === ' ' ? ' ' : c}</span>)}</div>
        <small>DEATH KERNEL ONLINE</small>
      </div>
    </div>
  );
}

export function QuoteFlash() {
  const [quote, setQuote] = useState('');
  useEffect(() => {
    let tid = 0;
    const flash = () => { setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]); window.clearTimeout(tid); tid = window.setTimeout(() => setQuote(''), 2400); };
    const first = window.setTimeout(flash, 1800);
    const intv = window.setInterval(flash, 7000);
    return () => { window.clearTimeout(first); window.clearTimeout(tid); window.clearInterval(intv); };
  }, []);
  return (
    <AnimatePresence>
      {quote ? (
        <motion.div className="quote-flash" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.04, y: -8 }}>
          {quote}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function SkullFlash() {
  const [flashes, setFlashes] = useState<Array<{ id: string; x: number; y: number; size: number; rot: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    let t = 0;
    const schedule = () => {
      t = window.setTimeout(() => {
        if (cancelled) return;
        const count = 1 + Math.floor(Math.random() * 4);
        setFlashes(Array.from({ length: count }, () => ({ id: nanoid(), x: 6 + Math.random() * 88, y: 6 + Math.random() * 76, size: 36 + Math.random() * 110, rot: -25 + Math.random() * 50 })));
        window.setTimeout(() => setFlashes([]), 900);
        schedule();
      }, 6000 + Math.random() * 12000);
    };
    schedule();
    return () => { cancelled = true; window.clearTimeout(t); };
  }, []);
  return (
    <div className="skull-flash-layer" aria-hidden="true">
      {flashes.map((f) => <Skull key={f.id} style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.size, height: f.size, transform: `translate(-50%,-50%) rotate(${f.rot}deg)`, position: 'absolute' }} />)}
    </div>
  );
}

export function BloodDrips() {
  const drips = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i, left: Math.floor(i * 4.6 + Math.sin(i * 1.9) * 2),
    delay: (i * 0.67) % 9, duration: 2.8 + (i % 5) * 0.9,
    width: 3 + (i % 4), height: 36 + (i % 4) * 22
  })), []);
  return (
    <div className="blood-drips" aria-hidden="true">
      {drips.map((d) => <div key={d.id} className="blood-drip" style={{ left: `${d.left}%`, width: d.width, height: d.height, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s` }} />)}
    </div>
  );
}
