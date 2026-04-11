'use client';

import { useState, useRef } from 'react';

export default function DebugPdfPage() {
  const [result, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setText('');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/debug-pdf', { method: 'POST', body: form });
    const data = await res.json();
    setText(data.rawText ?? data.error ?? JSON.stringify(data));
    setLoading(false);
  };

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Debug PDF — texte extrait</h1>
      <input ref={ref} type="file" accept=".pdf" onChange={handle} />
      {loading && <p style={{ marginTop: 16 }}>Extraction en cours...</p>}
      {result && (
        <>
          <p style={{ marginTop: 16, marginBottom: 8, color: '#666' }}>
            Sélectionne tout (Ctrl+A) dans la zone ci-dessous, puis copie-colle :
          </p>
          <textarea
            readOnly
            value={result}
            style={{
              width: '100%', height: '70vh', fontSize: 12,
              fontFamily: 'monospace', whiteSpace: 'pre', padding: 12,
              border: '1px solid #ccc', borderRadius: 8,
            }}
          />
        </>
      )}
    </div>
  );
}
