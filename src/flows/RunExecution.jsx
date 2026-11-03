import Screen from '../components/Screen.jsx';
import { useStore } from '../store.jsx';
import { STATUSES, countResults } from '../lib/constants.js';

// Flow 3b: jalankan test case satu per satu, update status dan catatan
export default function RunExecution({ id, nav }) {
  const { db, updateExec } = useStore();
  const e = db.execs.find((x) => x.id === id);
  if (!e) return null;

  const n = e.cases.length;
  const c = e.cases[e.idx];
  const rated = countResults(e).rated;
  const last = e.idx === n - 1;

  const setIdx = (i) => updateExec(id, (x) => ({ ...x, idx: i }));
  const setCase = (patch) =>
    updateExec(id, (x) => ({ ...x, cases: x.cases.map((k, i) => (i === x.idx ? { ...k, ...patch } : k)) }));

  return (
    <Screen
      title={e.title}
      onBack={() => nav('list')}
      footer={
        <>
          <button className="b b2" disabled={e.idx === 0} onClick={() => setIdx(e.idx - 1)}>Sebelumnya</button>
          <button className="b" onClick={() => (last ? nav('finish', { id }) : setIdx(e.idx + 1))}>
            {last ? 'Selesai' : 'Berikutnya'}
          </button>
        </>
      }
    >
      <div>
        <div className="r" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="m">Test case {e.idx + 1} dari {n}</span>
          <span className="m">{Math.round((rated / n) * 100)}%</span>
        </div>
        <div className="bar"><i style={{ width: `${(rated / n) * 100}%` }} /></div>
      </div>

      <div className="cd" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="m">{c.id}</div>
        <div className="t">{c.sc}</div>
        {c.st && (<><div className="m t">Langkah</div><div style={{ whiteSpace: 'pre-line' }}>{c.st}</div></>)}
        {c.ex && (<><div className="m t">Hasil yang diharapkan</div><div>{c.ex}</div></>)}
      </div>

      <div>
        <div className="l">Status</div>
        <div className="r" style={{ gap: 8 }}>
          {STATUSES.map((s) => (
            <button key={s} className={'sb' + (c.s === s ? ' on' : '')} aria-pressed={c.s === s} onClick={() => setCase({ s })}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="l" htmlFor="no">Catatan</label>
        <input className="in" id="no" value={c.note || ''} onChange={(ev) => setCase({ note: ev.target.value })} />
      </div>
    </Screen>
  );
}
