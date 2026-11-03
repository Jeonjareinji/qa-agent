import { useEffect, useRef, useState } from 'react';
import Screen from '../components/Screen.jsx';
import { useStore } from '../store.jsx';
import { deliver, generateReport } from '../lib/report.js';
import { renderPdfPages } from '../lib/renderPdf.js';

// Viewer report PDF di dalam Mini App (unduhan langsung sering diblokir WebView Telegram)
export default function PdfViewer({ id, from, nav }) {
  const { db } = useStore();
  const e = db.execs.find((x) => x.id === id);
  const [pdf, setPdf] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (!e) return undefined;
    let dead = false;
    (async () => {
      try {
        const p = await generateReport(e);
        if (dead) return;
        setPdf(p);
        await renderPdfPages(p.buf, box.current, () => dead);
        if (!dead) setStatus('ready');
      } catch (x) {
        if (!dead) { setError(x.message); setStatus('error'); }
      }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!e) return null;
  const back = () => nav(from === 'finish' ? 'finish' : 'list', { id });

  return (
    <Screen
      title="Report PDF"
      onBack={back}
      footer={
        <>
          <button className="b b2" disabled={!pdf} onClick={() => deliver(pdf)}>Unduh (browser)</button>
          <button className="b" onClick={back}>Kembali</button>
        </>
      }
    >
      {status === 'loading' && <div className="empty">Memuat report…</div>}
      {status === 'error' && <div className="empty">Tidak bisa menampilkan PDF: {error}</div>}
      <div className="pv" ref={box} />
    </Screen>
  );
}
