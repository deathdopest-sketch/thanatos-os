import { useState } from 'react';

export function LoveDiceApp() {
  const dares = ['Whisper your darkest secret.', 'Send a midnight message.', 'Draw something hauntingly beautiful.', 'Listen to a sad song together.', 'Write three lines of dark poetry.', 'Describe your ideal underworld date.', 'Name something that makes your soul ache.', 'Tell me what color your heartbreak is.', 'Confess a forbidden thought.', 'Describe your shadow self.'];
  const [result, setResult] = useState<{ d1: number; d2: number; dare: string } | null>(null);
  const roll = () => { const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6); setResult({ d1, d2, dare: dares[Math.floor(Math.random() * dares.length)] }); };
  return (
    <div className="love-dice-app">
      <button type="button" onClick={roll} className="slot-btn">🎲 Roll the Bones 🎲</button>
      {result && <div className="dice-result"><div className="dice-faces"><div className="dice-face">{result.d1}</div><span>+</span><div className="dice-face">{result.d2}</div><span>= {result.d1 + result.d2}</span></div><div className="dice-dare">{result.dare}</div></div>}
    </div>
  );
}
