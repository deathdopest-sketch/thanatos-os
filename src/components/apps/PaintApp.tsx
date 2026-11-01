import { useEffect, useRef, useState } from 'react';
import { Eraser, Paintbrush, Save, X } from 'lucide-react';

export function PaintApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#ff0030');
  const [size, setSize] = useState(8);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#030101';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => { drawing.current = true; last.current = pos(e); };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const p = pos(e);
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const clear = () => { const c = canvasRef.current!; const ctx = c.getContext('2d')!; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#030101'; ctx.fillRect(0, 0, c.width, c.height); };
  const download = () => { const a = document.createElement('a'); a.download = `thanatos-${Date.now()}.png`; a.href = canvasRef.current!.toDataURL(); a.click(); };

  return (
    <div className="paint-app">
      <div className="paint-toolbar">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Color" />
        <input type="range" min="1" max="40" value={size} onChange={(e) => setSize(Number(e.target.value))} title="Size" />
        <button type="button" className={tool === 'brush' ? 'selected' : ''} onClick={() => setTool('brush')}><Paintbrush size={15} /> Brush</button>
        <button type="button" className={tool === 'eraser' ? 'selected' : ''} onClick={() => setTool('eraser')}><Eraser size={15} /> Eraser</button>
        <button type="button" onClick={clear}><X size={15} /> Clear</button>
        <button type="button" onClick={download}><Save size={15} /> Save</button>
      </div>
      <canvas ref={canvasRef} className="paint-canvas" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => { drawing.current = false; }} onMouseLeave={() => { drawing.current = false; }} />
    </div>
  );
}
