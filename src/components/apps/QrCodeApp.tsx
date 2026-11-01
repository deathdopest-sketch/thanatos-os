import { useEffect, useState } from 'react';
import { QrCode, Save } from 'lucide-react';
import QRCode from 'qrcode';

export function QrCodeApp() {
  const [text, setText] = useState('https://github.com/deathdopest-sketch/thanatos-os');
  const [dataUrl, setDataUrl] = useState('');
  const [err, setErr] = useState('');
  const gen = async () => { try { setDataUrl(await QRCode.toDataURL(text, { color: { dark: '#ff0030', light: '#030101' }, width: 280, margin: 2 })); setErr(''); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } };
  useEffect(() => { void gen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="qr-app">
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void gen()} />
      <button type="button" onClick={() => void gen()}><QrCode size={15} /> Generate</button>
      {err && <div className="vfs-error">{err}</div>}
      {dataUrl && <img src={dataUrl} alt="QR" className="qr-image" />}
      {dataUrl && <a href={dataUrl} download="thanatos-qr.png"><button type="button"><Save size={15} /> Download</button></a>}
    </div>
  );
}
