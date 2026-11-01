import { useMemo, useState } from 'react';

export function RegexTesterApp() {
  const [pattern, setPattern] = useState('death|blood|skull');
  const [sample, setSample] = useState('the death kernel bleeds red skull light into the blood dark');
  const [flags, setFlags] = useState('gi');
  const result = useMemo(() => {
    try {
      const matches = [...sample.matchAll(new RegExp(pattern, flags))].map((m) => m[0]);
      const hl = sample.replace(new RegExp(pattern, flags), (m) => `【${m}】`);
      return { matches, hl, error: '' };
    } catch (e) { return { matches: [], hl: '', error: e instanceof Error ? e.message : 'Invalid' }; }
  }, [pattern, sample, flags]);
  return (
    <div className="tool-panel">
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="regex..." style={{ flex: 1 }} />
        <input value={flags} onChange={(e) => setFlags(e.target.value)} style={{ width: 56 }} placeholder="flags" />
      </div>
      <textarea value={sample} onChange={(e) => setSample(e.target.value)} />
      {result.error && <div className="vfs-error">{result.error}</div>}
      <code style={{ padding: 12 }}>{result.hl || 'matches shown here'}</code>
      <small style={{ color: '#c7a45e' }}>{result.matches.length} match(es): {result.matches.join(', ')}</small>
    </div>
  );
}
