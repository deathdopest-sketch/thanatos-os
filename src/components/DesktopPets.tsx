import { useEffect, useRef, useState } from 'react';
import { PetSprite } from '../lib/pet-sprite';
import { useRotvicePets, type DesktopPet } from '../lib/rotvice-pets';

const SIZE = 96;          // on-screen sprite size (px)
const SPEED = 38;         // walking speed (px/s)
const TASKBAR = 52;       // pets walk along the top of the taskbar

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function WanderingPet({ pet, index }: { pet: DesktopPet; index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodyRef = useRef<HTMLButtonElement>(null);
  const spriteRef = useRef<PetSprite | null>(null);
  const [card, setCard] = useState(false);
  // Stats arrive every 30s with fresh objects; only restart the sprite if the sheet changed.
  const spriteKey = JSON.stringify(pet.sprite);

  useEffect(() => {
    const canvas = canvasRef.current;
    const body = bodyRef.current;
    if (!canvas || !body) return;
    const sprite = new PetSprite(canvas, JSON.parse(spriteKey), pet.spriteUrl);
    spriteRef.current = sprite;

    // Simple wander: stand around, pick a spot, walk there, repeat.
    const maxX = () => Math.max(0, window.innerWidth - SIZE);
    let x = Math.min(maxX(), 120 + index * (SIZE + 40));
    let target = x;
    let restUntil = performance.now() + rand(1500, 4000);
    let facing = 1;
    let last = performance.now();
    let raf = 0;
    const place = () => { body.style.transform = `translateX(${Math.round(x)}px)`; canvas.style.transform = `scaleX(${facing})`; };
    place();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (Math.abs(target - x) > 1) {
        const dir = Math.sign(target - x);
        facing = dir;
        x += dir * Math.min(Math.abs(target - x), SPEED * dt);
        sprite.setLoop('move');
        if (Math.abs(target - x) <= 1) { restUntil = now + rand(2500, 7000); sprite.setLoop('idle'); }
      } else if (now > restUntil) {
        target = rand(0, maxX());
      }
      x = Math.min(x, maxX());
      place();
      raf = requestAnimationFrame(step);
    };
    if (!reduceMotion()) raf = requestAnimationFrame(step);

    return () => { cancelAnimationFrame(raf); sprite.stop(); spriteRef.current = null; };
  }, [spriteKey, pet.spriteUrl, index]);

  useEffect(() => {
    if (!card) return;
    const t = window.setTimeout(() => setCard(false), 3500);
    return () => window.clearTimeout(t);
  }, [card]);

  return (
    <button
      ref={bodyRef}
      type="button"
      className="desktop-pet"
      aria-label={`${pet.name}, level ${pet.level} ${pet.speciesName}`}
      onClick={() => { spriteRef.current?.play('action'); setCard(true); }}
    >
      {card ? (
        <span className="desktop-pet-card">
          <strong>{pet.name}</strong>
          <span>Lv {pet.level} {pet.speciesName}{pet.mood ? ` · ${pet.mood}` : ''}</span>
        </span>
      ) : null}
      <canvas ref={canvasRef} width={SIZE * 2} height={SIZE * 2} style={{ width: SIZE, height: SIZE }} />
    </button>
  );
}

/** Your RotVice pets, wandering along the taskbar while RotVice is open. */
export default function DesktopPets({ visible }: { visible: boolean }) {
  const pets = useRotvicePets((s) => s.pets);
  if (!visible || pets.length === 0) return null;
  return (
    <div className="desktop-pets" style={{ bottom: TASKBAR }} aria-label="RotVice pets">
      {pets.map((pet, i) => <WanderingPet key={`${pet.slot}-${pet.spriteUrl}`} pet={pet} index={i} />)}
    </div>
  );
}
