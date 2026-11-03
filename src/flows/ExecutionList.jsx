import Screen from '../components/Screen.jsx';
import { useStore } from '../store.jsx';
import { countResults } from '../lib/constants.js';

// Flow 3a: daftar test execution, tombol Play untuk menjalankan
export default function ExecutionList({ nav }) {
  const { db } = useStore();
  return (
    <Screen
      title="Test Execution"
      onBack={() => nav('home')}
      footer={<button className="b" onClick={() => nav('create')}>Buat Test Execution</button>}
    >
      {db.execs.length === 0 && <div className="empty">Belum ada test execution.</div>}
      {db.execs.map((e) => {
        const c = countResults(e);
        const n = e.cases.length;
        const pct = n ? Math.round((c.rated / n) * 100) : 0;
        return (
          <div key={e.id} className="cd" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="r">
              <div style={{ flex: 1 }}>
                <div className="t">{e.title}</div>
                <div className="m">{n} test case{e.report ? ` · ${e.report.name}` : ''}</div>
              </div>
              <button className="pl" aria-label={`Play ${e.title}`} onClick={() => nav('run', { id: e.id })}>▶</button>
            </div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            <div className="r" style={{ justifyContent: 'space-between' }}>
              <span className="m">{c.rated} dari {n} dinilai</span>
              <span className={`p ${e.done ? 'ok' : c.rated ? 'run' : 'sk'}`}>
                {e.done ? 'Selesai' : c.rated ? 'Berjalan' : 'Belum mulai'}
              </span>
            </div>
            {e.done && (
              <button className="lk" style={{ alignSelf: 'flex-start', padding: 0 }}
                onClick={() => nav('pdf', { id: e.id, from: 'list' })}>
                Lihat report PDF
              </button>
            )}
          </div>
        );
      })}
    </Screen>
  );
}
