import Screen from '../components/Screen.jsx';
import { useStore } from '../store.jsx';
import { STATUSES, countResults } from '../lib/constants.js';
import { reportFileName } from '../lib/report.js';

// Flow 3c: ringkasan hasil, lalu buat report PDF otomatis (bukan upload)
export default function FinishExecution({ id, nav }) {
  const { db, updateExec } = useStore();
  const e = db.execs.find((x) => x.id === id);
  if (!e) return null;

  const c = countResults(e);
  const n = e.cases.length;
  const rate = n ? Math.round((c.Pass / n) * 100) : 0;
  const ready = e.done && e.report;

  function create() {
    updateExec(id, (x) => ({ ...x, done: true, report: { name: reportFileName(x.title), at: Date.now() } }));
    nav('pdf', { id, from: 'finish' });
  }

  return (
    <Screen
      title="Selesaikan Pengujian"
      onBack={() => nav('list')}
      footer={
        ready ? (
          <>
            <button className="b b2" onClick={() => nav('pdf', { id, from: 'finish' })}>Lihat PDF</button>
            <button className="b" onClick={() => nav('list')}>Selesai</button>
          </>
        ) : (
          <button className="b" onClick={create}>Buat Report PDF</button>
        )
      }
    >
      <div className="t">{e.title}</div>
      <div className="r" style={{ gap: 8 }}>
        {STATUSES.map((s) => (
          <div key={s} className="cd" style={{ flex: 1, textAlign: 'center', padding: '12px 4px' }}>
            <div className="t" style={{ fontSize: 22 }}>{c[s]}</div>
            <span className={`p ${s}`}>{s}</span>
          </div>
        ))}
      </div>
      {c.rated < n && <div className="m">{n - c.rated} test case belum dinilai; akan ditulis “Belum dinilai” di report.</div>}

      {ready ? (
        <div className="cd" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="t">Report PDF siap</div>
          <div className="m">{e.report.name}</div>
        </div>
      ) : (
        <div className="cd">
          <div className="t" style={{ marginBottom: 6 }}>Report PDF dibuat otomatis</div>
          <div className="m">
            Pass rate {rate}% ({c.Pass} dari {n} test case). Isi report: ringkasan hasil, tabel semua test case,
            dan detail test case Fail dan Blocked.
          </div>
        </div>
      )}
    </Screen>
  );
}
