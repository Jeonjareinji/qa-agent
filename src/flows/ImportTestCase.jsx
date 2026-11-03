import { useState } from 'react';
import Screen from '../components/Screen.jsx';
import { useToast } from '../components/Toast.jsx';
import { useStore } from '../store.jsx';
import { parseExcelFile } from '../lib/excel.js';
import { SAMPLE_CASES } from '../lib/sample.js';

// Flow 1: Import via Excel / input manual, kelola & hapus test case, lalu simpan
export default function ImportTestCase({ nav }) {
  const { db, addSet, deleteSet } = useStore();
  const toast = useToast();

  const [tab, setTab] = useState('add'); // 'add' | 'saved'
  const [inputMode, setInputMode] = useState('manual'); // 'manual' | 'file'

  const [title, setTitle] = useState('');
  const [cases, setCases] = useState([]);

  // Form input manual single test case
  const nextTcId = `TC-${String(cases.length + 1).padStart(3, '0')}`;
  const [manualId, setManualId] = useState(nextTcId);
  const [manualScenario, setManualScenario] = useState('');
  const [manualSteps, setManualSteps] = useState('');
  const [manualExpected, setManualExpected] = useState('');

  async function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const parsedCases = await parseExcelFile(f);
      if (!parsedCases.length) return toast('Tidak ada test case terbaca');
      setCases(parsedCases);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
      toast(`${parsedCases.length} test case berhasil dimuat`);
    } catch {
      toast('File tidak bisa dibaca');
    }
  }

  function loadSample() {
    setCases(SAMPLE_CASES);
    if (!title) setTitle('Login & Registrasi');
    toast('Data contoh dimuat');
  }

  function handleAddManualCase(e) {
    e?.preventDefault();
    const sc = manualScenario.trim();
    if (!sc) return toast('Isi skenario test case');

    const newCase = {
      id: manualId.trim() || `TC-${String(cases.length + 1).padStart(3, '0')}`,
      sc,
      st: manualSteps.trim(),
      ex: manualExpected.trim(),
    };

    const nextCases = [...cases, newCase];
    setCases(nextCases);
    setManualId(`TC-${String(nextCases.length + 1).padStart(3, '0')}`);
    setManualScenario('');
    setManualSteps('');
    setManualExpected('');
    toast('Test case ditambahkan ke daftar');
  }

  function handleDeleteDraftCase(index) {
    setCases(cases.filter((_, i) => i !== index));
    toast('Test case dihapus dari daftar');
  }

  function handleDeleteSavedSet(id, setTitleStr) {
    if (window.confirm(`Hapus kumpulan "${setTitleStr}"?`)) {
      deleteSet(id);
      toast('Kumpulan test case dihapus');
    }
  }

  function save() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return toast('Isi judul kumpulan test case dulu');
    if (!cases.length) return toast('Belum ada test case untuk disimpan');

    addSet(trimmedTitle, cases);
    toast('Kumpulan test case berhasil disimpan!');
    setTitle('');
    setCases([]);
    nav('home');
  }

  return (
    <Screen
      title="Kelola Test Case"
      onBack={() => nav('home')}
      footer={
        tab === 'add' ? (
          <button className="b" disabled={!title.trim() || !cases.length} onClick={save}>
            Simpan Kumpulan Test Case ({cases.length})
          </button>
        ) : (
          <button className="b" onClick={() => setTab('add')}>
            + Buat Kumpulan Baru
          </button>
        )
      }
    >
      {/* Tab Switcher */}
      <div className="r" style={{ gap: 8, marginBottom: 8 }}>
        <button
          className={'sb' + (tab === 'add' ? ' on' : '')}
          onClick={() => setTab('add')}
        >
          Input & Import
        </button>
        <button
          className={'sb' + (tab === 'saved' ? ' on' : '')}
          onClick={() => setTab('saved')}
        >
          Kumpulan Tersimpan ({db.sets.length})
        </button>
      </div>

      {tab === 'add' ? (
        <>
          {/* Judul Kumpulan */}
          <div>
            <label className="l" htmlFor="ti">Judul Kumpulan Test Case</label>
            <input
              className="in"
              id="ti"
              placeholder="mis. Fitur Authentication, Checkout, dll."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Mode Input Selector */}
          <div>
            <div className="l">Metode Pengisian</div>
            <div className="r" style={{ gap: 8 }}>
              <button
                type="button"
                className={'sb' + (inputMode === 'manual' ? ' on' : '')}
                onClick={() => setInputMode('manual')}
              >
                ✏️ Input Manual
              </button>
              <button
                type="button"
                className={'sb' + (inputMode === 'file' ? ' on' : '')}
                onClick={() => setInputMode('file')}
              >
                📁 Upload Excel / Contoh
              </button>
            </div>
          </div>

          {/* Sub-view: Manual Input Form */}
          {inputMode === 'manual' && (
            <div className="cd" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="t">Tambah Test Case Baru</div>
              <div>
                <label className="l" htmlFor="tcId">ID Test Case</label>
                <input
                  className="in"
                  id="tcId"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="mis. TC-001"
                />
              </div>
              <div>
                <label className="l" htmlFor="tcSc">Skenario / Deskripsi *</label>
                <input
                  className="in"
                  id="tcSc"
                  value={manualScenario}
                  onChange={(e) => setManualScenario(e.target.value)}
                  placeholder="mis. Login dengan password salah"
                />
              </div>
              <div>
                <label className="l" htmlFor="tcSt">Langkah-langkah (Steps)</label>
                <textarea
                  className="in"
                  id="tcSt"
                  value={manualSteps}
                  onChange={(e) => setManualSteps(e.target.value)}
                  placeholder="1. Masuk ke halaman login&#10;2. Ketik password keliru&#10;3. Tekan Masuk"
                />
              </div>
              <div>
                <label className="l" htmlFor="tcEx">Hasil yang Diharapkan (Expected)</label>
                <textarea
                  className="in"
                  id="tcEx"
                  value={manualExpected}
                  onChange={(e) => setManualExpected(e.target.value)}
                  placeholder="Muncul pesan error validasi"
                />
              </div>
              <button
                type="button"
                className="b b2"
                style={{ marginTop: 4 }}
                onClick={handleAddManualCase}
              >
                + Tambahkan ke Daftar
              </button>
            </div>
          )}

          {/* Sub-view: File Upload / Sample */}
          {inputMode === 'file' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="dz">
                <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
                <span className="t">Pilih file Excel (.xlsx / .csv)</span>
                <span className="m">Format kolom: ID, Scenario, Steps, Expected</span>
              </label>
              <button className="lk" style={{ alignSelf: 'center' }} onClick={loadSample}>
                Pakai data contoh login (4 test cases)
              </button>
            </div>
          )}

          {/* Preview & Delete Draft Test Cases */}
          {cases.length > 0 ? (
            <div className="cd" style={{ padding: 0 }}>
              <div className="r" style={{ justifyContent: 'space-between', padding: '12px 14px' }}>
                <span className="t">Daftar Test Case ({cases.length})</span>
                <button
                  type="button"
                  className="lk"
                  style={{ color: 'var(--bad)', padding: 0, fontSize: 13 }}
                  onClick={() => {
                    if (window.confirm('Kosongkan semua test case di draft?')) setCases([]);
                  }}
                >
                  Kosongkan Semua
                </button>
              </div>
              {cases.map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    borderTop: '1px solid var(--bd)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div className="r" style={{ justifyContent: 'space-between' }}>
                    <span className="m" style={{ fontWeight: 600 }}>{c.id}</span>
                    <button
                      type="button"
                      className="lk"
                      style={{ color: 'var(--bad)', padding: 0, fontSize: 13 }}
                      onClick={() => handleDeleteDraftCase(i)}
                      aria-label={`Hapus ${c.id}`}
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="t">{c.sc}</div>
                  {c.st && <div className="m" style={{ whiteSpace: 'pre-line' }}>{c.st}</div>}
                  {c.ex && <div className="m" style={{ color: 'var(--ok)' }}>E: {c.ex}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">Belum ada test case dalam kumpulan ini.</div>
          )}
        </>
      ) : (
        /* Tab: Kumpulan Tersimpan */
        <div>
          {db.sets.length === 0 ? (
            <div className="empty">
              Belum ada kumpulan test case tersimpan.<br />
              Silakan buat baru melalui tab "Input & Import".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {db.sets.map((s) => (
                <div key={s.id} className="cd" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="r" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div className="t">{s.title}</div>
                      <div className="m">{s.cases.length} test case · Dibuat {s.at}</div>
                    </div>
                    <button
                      type="button"
                      className="lk"
                      style={{ color: 'var(--bad)', fontSize: 14 }}
                      onClick={() => handleDeleteSavedSet(s.id, s.title)}
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="cd" style={{ background: 'var(--bg)', padding: '8px 10px', fontSize: 13 }}>
                    {s.cases.slice(0, 2).map((c, idx) => (
                      <div key={idx} className="m" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        • <strong>{c.id}</strong>: {c.sc}
                      </div>
                    ))}
                    {s.cases.length > 2 && (
                      <div className="m" style={{ fontStyle: 'italic', marginTop: 2 }}>
                        + {s.cases.length - 2} test case lainnya
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Screen>
  );
}
