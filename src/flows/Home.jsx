import Screen from '../components/Screen.jsx';
import { useStore } from '../store.jsx';

function MenuItem({ title, desc, onClick }) {
  return (
    <button className="cd menu" onClick={onClick}>
      <span style={{ flex: 1 }}>
        <span className="t" style={{ display: 'block' }}>{title}</span>
        <span className="m">{desc}</span>
      </span>
      <span aria-hidden="true">›</span>
    </button>
  );
}

// Menu utama: tiga flow (Import Test Case, Buat Test Execution, Test Execution)
export default function Home({ nav }) {
  const { db } = useStore();
  const total = db.sets.reduce((a, s) => a + s.cases.length, 0);
  return (
    <Screen title="QA Agent">
      <div className="m">Kelola test case dan test execution.</div>
      <MenuItem title="Import Test Case" desc={`${db.sets.length} kumpulan · ${total} test case`} onClick={() => nav('import')} />
      <MenuItem title="Buat Test Execution" desc="Pilih kumpulan test case" onClick={() => nav('create')} />
      <MenuItem title="Test Execution" desc={`${db.execs.length} execution`} onClick={() => nav('list')} />
    </Screen>
  );
}
