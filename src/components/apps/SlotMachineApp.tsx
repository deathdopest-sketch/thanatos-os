import { useState } from 'react';
import clsx from 'clsx';

export function SlotMachineApp() {
  const symbols = ['☠', '\u{1F578}', '⚰', '\u{1F339}', '\u{1F52E}', '\u{1F987}', '☠', '\u{1F56F}'];
  const [reels, setReels] = useState(['☠', '\u{1F578}', '☠']);
  const [spinning, setSpinning] = useState(false);
  const [msg, setMsg] = useState('Pull the lever...');
  const spin = () => {
    setSpinning(true); setMsg('Spinning...');
    let ticks = 0;
    const iv = window.setInterval(() => {
      setReels([symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]]);
      ticks++;
      if (ticks >= 18) {
        window.clearInterval(iv);
        const final = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];
        setReels(final); setSpinning(false);
        setMsg(final[0] === final[1] && final[1] === final[2] ? '☠ JACKPOT ☠' : final[0] === final[1] || final[1] === final[2] ? 'Close... death teases.' : 'No match. Death waits.');
      }
    }, 80);
  };
  return (
    <div className="slot-machine">
      <div className="slot-reels">{reels.map((s, i) => <div key={i} className={clsx('slot-reel', spinning && 'spinning')}>{s}</div>)}</div>
      <button type="button" onClick={spin} disabled={spinning} className="slot-btn">{spinning ? 'Spinning...' : '☠ PULL ☠'}</button>
      <p className="slot-msg">{msg}</p>
    </div>
  );
}
