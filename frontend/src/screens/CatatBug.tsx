import { useState } from 'react'
import { DAFTAR_PRIORITAS_BUG, DAFTAR_SEVERITY, DAFTAR_TIPE_BUG } from '../data/dummy.ts'
import type { Evidence, InputEvidence, KasusExecution, PrioritasBug, Severity, TipeBug } from '../data/dummy.ts'
import { Button } from '../components/Button.tsx'
import { PemilihEvidence, Thumbs } from '../components/Evidence.tsx'
import { itemThumb } from '../components/evidenceItem.ts'
import type { ItemThumb } from '../components/evidenceItem.ts'
import { SelectField, TextArea, TextField } from '../components/Fields.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { catatBug, getBugBerikut } from '../lib/api.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

interface Props {
  executionId: string
  kasus: KasusExecution
  onTutup: () => void
  onTersimpan: () => void
}

export function CatatBug({ executionId, kasus, onTutup, onTersimpan }: Props) {
  const bugBerikut = useLoad('bug-berikut', getBugBerikut)
  const [judul, setJudul] = useState('')
  const [severity, setSeverity] = useState<Severity>('Major')
  const [prioritas, setPrioritas] = useState<PrioritasBug>('P2 - High')
  const [tipe, setTipe] = useState<TipeBug>('Functional')
  const [actual, setActual] = useState(kasus.actualResult)
  const [baru, setBaru] = useState<InputEvidence[]>([])
  const [coba, setCoba] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)

  const judulKosong = judul.trim() === ''
  const thumb: ItemThumb[] = [
    ...kasus.evidence.map((e) => itemThumb(e, 'TC')),
    ...baru.map((b, i) =>
      itemThumb({ id: 'baru-' + i, ...b, ditambahkanPada: '' } satisfies Evidence, 'Baru'),
    ),
  ]

  async function simpan() {
    setCoba(true)
    if (judulKosong) {
      haptic('gagal')
      return
    }
    setMenyimpan(true)
    try {
      const bug = await catatBug({
        executionId,
        tcId: kasus.tcId,
        judul: judul.trim(),
        severity,
        prioritas,
        tipe,
        actualResult: actual.trim(),
        evidenceBaru: baru,
      })
      haptic('sukses')
      await showAlert(`${bug.id} tercatat untuk ${kasus.tcId}.`)
      onTersimpan()
    } catch (e) {
      setMenyimpan(false)
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal mencatat bug.')
    }
  }

  return (
    <Sheet
      diAtas
      judul="Catat bug"
      subjudul={
        <span className="t-sm c-2">
          <span className="mono">{bugBerikut.data ?? '…'}</span> · {kasus.tcId}
        </span>
      }
      onTutup={onTutup}
      kaki={
        <Button blok onKlik={() => void simpan()} nonaktif={menyimpan}>
          {menyimpan ? 'Menyimpan…' : 'Simpan bug'}
        </Button>
      }
    >
      <div className="col col-16">
        <TextField
          label="Judul bug"
          nilai={judul}
          onUbah={setJudul}
          placeholder="Ringkas masalah yang ditemukan"
          galat={coba && judulKosong}
        />
        {coba && judulKosong && <span className="help c-fail">Judul bug wajib diisi.</span>}
        <SelectField label="Severity" nilai={severity} onUbah={(v) => setSeverity(v as Severity)} pilihan={DAFTAR_SEVERITY} />
        <SelectField
          label="Prioritas"
          nilai={prioritas}
          onUbah={(v) => setPrioritas(v as PrioritasBug)}
          pilihan={DAFTAR_PRIORITAS_BUG}
        />
        <SelectField label="Tipe bug" nilai={tipe} onUbah={(v) => setTipe(v as TipeBug)} pilihan={DAFTAR_TIPE_BUG} />
        <TextArea label="Actual result" nilai={actual} onUbah={setActual} baris={3} />
        <div className="col col-8">
          <span className="label">Evidence</span>
          {thumb.length === 0 && <span className="help">Belum ada evidence.</span>}
          <Thumbs item={thumb} />
          {kasus.evidence.length > 0 && <span className="help">Evidence test case ikut terlampir otomatis.</span>}
          <PemilihEvidence mode="dua" onTambah={(b) => setBaru((d) => [...d, b])} />
        </div>
      </div>
    </Sheet>
  )
}
