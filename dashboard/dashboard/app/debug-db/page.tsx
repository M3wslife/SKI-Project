'use client';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/debug-db')
      .then(r => r.json())
      .then(setData);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', background: '#111', color: '#fff' }}>
      <h1>Database Connection Debug</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
