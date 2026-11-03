import { useState } from 'react'
import type { Criticality, Prioritas, TestCase, Tipe } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { Banner } from '../components/Banner.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { SelectField, TextArea, TextField } from '../components/Fields.tsx'
import { Galat, Memuat } from '../components/Kosong.tsx'
import { getKumpulan, updateTestCase } from '../lib/api.ts'
import type { Nav } from '../lib/nav.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

const TIPE: Tipe[] = ['Positive', 'Negative', 'Edge']
const PRIORITAS: Prioritas[] = ['High', 'Medium', 'Low']
const CRITICALITY: Criticality[] = ['Safety-Critical', 'High', 'Medium', 'Low']

function Formulir({ nav, kumpulanId, awal, versi }: { nav: Nav; kumpulanId: string; awal: TestCase; versi: number }) {
  const hardware = awal.jenis === 'hardware'
  const [tc, setTc] = useState<TestCase>(awal)
  const [langkah, setLangkah] = useState(awal.steps.join('\n'))
  const [coba, setCoba] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)

  function ubah<K extends keyof TestCase>(kunci: K, nilai: TestCase[K]) {
    setTc((d) => ({ ...d, [kunci]: nilai }))
  }

  const daftarLangkah = langkah
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const wajib: { kunci: string; kosong: boolean }[] = [
    { kunci: 'scenario', kosong: tc.scenario.trim() === '' },
    { kunci: 'steps', kosong: daftarLangkah.length === 0 },
    { kunci: 'expected', kosong: tc.expected.trim() === '' },
  ]
  const kosong = (kunci: string) => coba && (wajib.find((w) => w.kunci === kunci)?.kosong ?? false)

  async function simpan() {
    setCoba(true)
    if (wajib.some((w) => w.kosong)) {
      haptic('gagal')
      return
    }
    setMenyimpan(true)
    try {
      await updateTestCase(kumpulanId, { ...tc, steps: daftarLangkah })
      haptic('sukses')
      await showAlert(`${tc.id} disimpan sebagai versi ${versi + 1}.`)
      nav.kembali()
    } catch (e) {
      setMenyimpan(false)
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal menyimpan.')
    }
  }

  return (
    <>
      <AppBar judul={'Edit ' + tc.id} subjudul={`Versi ${versi} → ${versi + 1}`} onKembali={nav.kembali} />
      <div className="scroll">
        <Banner jenis="info">
          <span className="t-sm">
            Ini mengubah test case utama. Execution yang sudah dibuat memakai salinannya sendiri dan tidak ikut berubah.
          </span>
        </Banner>
        <TextField label="Scenario" nilai={tc.scenario} onUbah={(v) => ubah('scenario', v)} galat={kosong('scenario')} />
        {kosong('scenario') && <span className="help c-fail">Scenario wajib diisi.</span>}
        <TextField label={hardware ? 'Komponen / Subsistem' : 'Modul / Menu'} nilai={tc.modul} onUbah={(v) => ubah('modul', v)} />
        {!hardware && <TextField label="Fitur" nilai={tc.fitur} onUbah={(v) => ubah('fitur', v)} />}
        {!hardware && (
          <TextField label="Ref Requirement" nilai={tc.refRequirement} onUbah={(v) => ubah('refRequirement', v)} mono />
        )}
        <SelectField label="Tipe" nilai={tc.tipe} onUbah={(v) => ubah('tipe', v as Tipe)} pilihan={TIPE} />
        <SelectField
          label={hardware ? 'Criticality' : 'Priority'}
          nilai={tc.prioritas}
          onUbah={(v) => ubah('prioritas', v as Prioritas | Criticality)}
          pilihan={hardware ? CRITICALITY : PRIORITAS}
        />
        <TextArea
          label={hardware ? 'Precondition (kondisi device)' : 'Precondition'}
          nilai={tc.precondition}
          onUbah={(v) => ubah('precondition', v)}
          baris={2}
        />
        {!hardware && <TextArea label="Test Data" nilai={tc.testData} onUbah={(v) => ubah('testData', v)} baris={2} />}
        <TextArea
          label="Test Steps (satu langkah per baris)"
          nilai={langkah}
          onUbah={setLangkah}
          baris={5}
          galat={kosong('steps')}
        />
        {kosong('steps') && <span className="help c-fail">Isi minimal satu langkah.</span>}
        {hardware && (
          <>
            <TextField label="Parameter Diukur" nilai={tc.parameterDiukur ?? ''} onUbah={(v) => ubah('parameterDiukur', v)} />
            <TextField label="Satuan" nilai={tc.satuan ?? ''} onUbah={(v) => ubah('satuan', v)} />
            <TextField label="Batas Lulus (Spec)" nilai={tc.batasLulus ?? ''} onUbah={(v) => ubah('batasLulus', v)} />
            <TextField label="Sumber Spec" nilai={tc.sumberSpec ?? ''} onUbah={(v) => ubah('sumberSpec', v)} />
          </>
        )}
        <TextArea
          label="Expected Result"
          nilai={tc.expected}
          onUbah={(v) => ubah('expected', v)}
          baris={3}
          galat={kosong('expected')}
        />
        {kosong('expected') && <span className="help c-fail">Expected result wajib diisi.</span>}
      </div>
      <BottomBar dua>
        <Button varian="secondary" onKlik={nav.kembali} nonaktif={menyimpan}>
          Batal
        </Button>
        <Button onKlik={() => void simpan()} nonaktif={menyimpan}>
          {menyimpan ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </BottomBar>
    </>
  )
}

export function EditTestCase({ nav, kumpulanId, tcId }: { nav: Nav; kumpulanId: string; tcId: string }) {
  const { data, galat, muatUlang } = useLoad('kumpulan:' + kumpulanId, () => getKumpulan(kumpulanId))
  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />
  const tc = data.testCases.find((t) => t.id === tcId)
  if (!tc) return <Galat pesan={`Test case ${tcId} tidak ditemukan.`} onUlang={nav.kembali} />
  return <Formulir nav={nav} kumpulanId={kumpulanId} awal={tc} versi={data.versi} />
}
