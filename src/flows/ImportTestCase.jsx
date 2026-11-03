import { useState } from 'react';
import Screen from '../components/Screen.jsx';
import { useToast } from '../components/Toast.jsx';
import { useStore } from '../store.jsx';
import { parseExcelFile } from '../lib/excel.js';
import { SAMPLE_CASES } from '../lib/sample.js';

// Flow 1: upload Excel, isi judul, simpan test case
export default function ImportTestCase({ nav }) {
  const { addSet } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState(null); // { file, title, cases }

  async function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const cases = await parseExcelFile(f);
      if (!cases.length) return toast('Tidak ada test case terbaca');
      setDraft({ file: f.name, title: f.name.replace(/\.[^.]+$/, ''), cases });
    } catch {
      toast('File tidak bisa dibaca');
    }
  }

  function save() {
    const title = draft.title.trim();
    if (!title) return toast('Isi judul dulu');
    addSet(title, draft.cases);
    toast('Test case tersimpan');
    nav('home');
  }

  return (
    <Screen
      title="Import Test Case"
      onBack={() => nav('home')}
      footer={<button className="b" disabled={!draft} onClick={save}>Simpan Test Case</button>}
    >
      <label className="dz">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
        <span className="t">{draft ? draft.file : 'Pilih file Excel'}</span>
        <span className="m">{draft ? `${draft.cases.length} test case terdeteksi` : 'Kolom: ID, Scenario, Steps, Expected (.xlsx / .csv)'}</span>
      </label>
      <button className="lk" style={{ alignSelf: 'center' }}
        onClick={() => setDraft({ file: 'contoh-login.xlsx', title: 'Login & Registrasi', cases: SAMPLE_CASES })}>
        Pakai data contoh
      </button>

      {draft && (
        <>
          <div>
            <label className="l" htmlFor="ti">Judul test case</label>
            <input className="in" id="ti" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="cd" style={{ padding: 0 }}>
            <div className="m" style={{ padding: '10px 14px', fontWeight: 600 }}>
              Pratinjau ({Math.min(3, draft.cases.length)} dari {draft.cases.length})
            </div>
            {draft.cases.slice(0, 3).map((c, i) => (
              <div key={i} style={{ padding: '10px 14px', borderTop: '1px solid var(--bd)' }}>
                <div className="m">{c.id}</div>
                {c.sc}
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}
