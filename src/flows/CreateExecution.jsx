import { useState } from 'react';
import Screen from '../components/Screen.jsx';
import { useToast } from '../components/Toast.jsx';
import { useStore } from '../store.jsx';

// Flow 2: pilih kumpulan test case, isi judul, submit
export default function CreateExecution({ nav }) {
  const { db, addExecution } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [pick, setPick] = useState({});

  const chosen = db.sets.filter((s) => pick[s.id]);
  const total = chosen.reduce((a, s) => a + s.cases.length, 0);

  function submit() {
    if (!title.trim()) return toast('Isi judul test execution');
    addExecution(title.trim(), chosen.map((s) => s.id));
    toast('Test execution dibuat');
    nav('list');
  }

  if (!db.sets.length) {
    return (
      <Screen title="Buat Test Execution" onBack={() => nav('home')}
        footer={<button className="b" onClick={() => nav('import')}>Tambah Test Case</button>}>
        <div className="empty">Belum ada test case tersimpan.<br />Buat atau import dulu lewat menu Kelola Test Case.</div>
      </Screen>
    );
  }

  return (
    <Screen
      title="Buat Test Execution"
      onBack={() => nav('home')}
      footer={
        <button className="b" disabled={!chosen.length} onClick={submit}>
          Submit{chosen.length ? ` (${chosen.length} dipilih · ${total} test case)` : ''}
        </button>
      }
    >
      <div>
        <label className="l" htmlFor="te">Judul test execution</label>
        <input className="in" id="te" value={title} placeholder="mis. Regression Sprint 12" onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="l" style={{ margin: '4px 0 0' }}>Pilih kumpulan test case</div>
      {db.sets.map((s) => (
        <label key={s.id} className="cd r">
          <input className="chk" type="checkbox" checked={!!pick[s.id]} onChange={(e) => setPick({ ...pick, [s.id]: e.target.checked })} />
          <span>
            <span className="t" style={{ display: 'block' }}>{s.title}</span>
            <span className="m">{s.cases.length} test case · {s.at}</span>
          </span>
        </label>
      ))}
    </Screen>
  );
}
