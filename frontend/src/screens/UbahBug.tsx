import { useState } from 'react'
import { DAFTAR_PRIORITAS_BUG, DAFTAR_SEVERITY, DAFTAR_STATUS_BUG, DAFTAR_TIPE_BUG } from '../data/dummy.ts'
import type { Evidence, InputEvidence, PrioritasBug, Severity, StatusBug, TipeBug } from '../data/dummy.ts'
import type { BugLengkap } from '../data/dummy.ts'
import { Button } from '../components/Button.tsx'
import { Chips } from '../components/Chips.tsx'
import { PemilihEvidence, Thumbs } from '../components/Evidence.tsx'
import { itemThumb } from '../components/evidenceItem.ts'
import { SelectField, TextArea, TextField } from '../components/Fields.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { updateBug } from '../lib/api.ts'
import { haptic, showAlert } from '../lib/telegram.ts'

interface Props {
  bug: BugLengkap
  onTutup: () => void
  onTersimpan: () => void
}

// Mengubah bug yang sudah ada. Execution dan test case asal tidak bisa diubah.
export function UbahBug({ bug, onTutup, onTersimpan }: Props) {
  const [judul, setJudul] = useState(bug.judul)
  const [status, setStatus] = useState<StatusBug>(bug.status)
  const [severity, setSeverity] = useState<Severity>(bug.severity)
  const [prioritas, setPrioritas] = useState<PrioritasBug>(bug.prioritas)
  const [tipe, setTipe] = useState<TipeBug>(bug.tipe)
  const [actual, setActual] = useState(bug.actualResult)
  const [baru, setBaru] = useState<InputEvidence[]>([])
  const [coba, setCoba] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)

  const judulKosong = judul.trim() === ''
  const adaPerubahan =
    judul.trim() !== bug.judul ||
    status !== bug.status ||
    severity !== bug.severity ||
    prioritas !== bug.prioritas ||
    tipe !== bug.tipe ||
    actual.trim() !== bug.actualResult ||
    baru.length > 0

  async function simpan() {
    setCoba(true)
    if (judulKosong) {
      haptic('gagal')
      return
    }
    setMenyimpan(true)
    try {
      await updateBug(bug.id, {
        judul: judul.trim(),
        status,
        severity,
        prioritas,
        tipe,
        actualResult: actual.trim(),
        evidenceBaru: baru,
      })
      haptic('sukses')
      await showAlert(`${bug.id} diperbarui.`)
      onTersimpan()
    } catch (e) {
      setMenyimpan(false)
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal memperbarui bug.')
    }
  }

  return (
    <Sheet
      diAtas
      judul={'Ubah ' + bug.id}
      subjudul={
        <span className="t-sm c-2">
          {bug.executionJudul} · {bug.tcId ?? 'Di luar scenario'}
        </span>
      }
      onTutup={onTutup}
      kaki={
        <Button blok onKlik={() => void simpan()} nonaktif={menyimpan || !adaPerubahan}>
          {menyimpan ? 'Menyimpan…' : 'Simpan perubahan'}
        </Button>
      }
    >
      <div className="col col-16">
        <section className="col col-8">
          <span className="label">Status</span>
          <Chips
            label="Status bug"
            item={DAFTAR_STATUS_BUG.map((s) => ({ nilai: s, label: s }))}
            terpilih={status}
            onPilih={setStatus}
          />
        </section>
        <TextField label="Judul bug" nilai={judul} onUbah={setJudul} galat={coba && judulKosong} />
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
          {bug.evidence.length + baru.length === 0 && <span className="help">Belum ada evidence.</span>}
          <Thumbs
            item={[
              ...bug.evidence.map((e) => itemThumb(e)),
              ...baru.map((b, i) =>
                itemThumb({ id: 'baru-' + i, ...b, ditambahkanPada: '' } satisfies Evidence, 'Baru'),
              ),
            ]}
          />
          <PemilihEvidence mode="dua" onTambah={(b) => setBaru((d) => [...d, b])} />
        </div>
      </div>
    </Sheet>
  )
}
