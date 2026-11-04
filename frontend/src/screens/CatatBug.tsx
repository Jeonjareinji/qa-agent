import { useState } from 'react'
import { DAFTAR_PRIORITAS_BUG, DAFTAR_SEVERITY, DAFTAR_TIPE_BUG } from '../data/dummy.ts'
import type { Evidence, InputEvidence, KasusExecution, PrioritasBug, Severity, TipeBug } from '../data/dummy.ts'
import { Button } from '../components/Button.tsx'
import { PemilihEvidence, Thumbs } from '../components/Evidence.tsx'
import { itemThumb } from '../components/evidenceItem.ts'
import type { ItemThumb } from '../components/evidenceItem.ts'
import { SelectField, SelectOpsi, TextArea, TextField } from '../components/Fields.tsx'
import { SearchableSelect } from '../components/SearchableSelect.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { catatBug, getBugBerikut, listExecutions } from '../lib/api.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

interface Props {
  // Dari dalam execution: execution dan test case sudah pasti (kasus null = bug di luar scenario).
  executionId?: string
  kasus?: KasusExecution | null
  // Dari Bug List: pengguna memilih execution dan, kalau ada, test case-nya.
  pilih?: boolean
  onTutup: () => void
  onTersimpan: () => void
}

export function CatatBug({ executionId, kasus = null, pilih = false, onTutup, onTersimpan }: Props) {
  const bugBerikut = useLoad('bug-berikut', getBugBerikut)
  const daftarExecution = useLoad('execution-untuk-bug', listExecutions)
  const [execDipilih, setExecDipilih] = useState('')
  const [tcDipilih, setTcDipilih] = useState('') // '' = di luar scenario
  const [judul, setJudul] = useState('')
  const [severity, setSeverity] = useState<Severity>('Major')
  const [prioritas, setPrioritas] = useState<PrioritasBug>('P2 - High')
  const [tipe, setTipe] = useState<TipeBug>('Functional')
  const [actual, setActual] = useState(kasus?.actualResult ?? '')
  const [baru, setBaru] = useState<InputEvidence[]>([])
  const [coba, setCoba] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)

  const executions = daftarExecution.data ?? []
  const executionAktifId = pilih ? execDipilih || executions[0]?.id || '' : (executionId ?? '')
  const executionAktif = executions.find((e) => e.id === executionAktifId)
  const kasusAktif = pilih ? (executionAktif?.kasus.find((k) => k.tcId === tcDipilih) ?? null) : kasus

  const judulKosong = judul.trim() === ''
  const thumb: ItemThumb[] = [
    ...(kasusAktif?.evidence ?? []).map((e) => itemThumb(e, 'TC')),
    ...baru.map((b, i) =>
      itemThumb({ id: 'baru-' + i, ...b, ditambahkanPada: '' } satisfies Evidence, 'Baru'),
    ),
  ]

  async function simpan() {
    setCoba(true)
    if (judulKosong || executionAktifId === '') {
      haptic('gagal')
      return
    }
    setMenyimpan(true)
    try {
      const bug = await catatBug({
        executionId: executionAktifId,
        tcId: kasusAktif?.tcId ?? null,
        judul: judul.trim(),
        severity,
        prioritas,
        tipe,
        actualResult: actual.trim(),
        evidenceBaru: baru,
      })
      haptic('sukses')
      await showAlert(`${bug.id} tercatat${kasusAktif ? ' untuk ' + kasusAktif.tcId : ' di luar scenario'}.`)
      onTersimpan()
    } catch (e) {
      setMenyimpan(false)
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal mencatat bug.')
    }
  }

  return (
    <Sheet
      diAtas={!pilih && kasus !== null}
      judul={pilih ? 'Buat bug' : 'Catat bug'}
      subjudul={
        <span className="t-sm c-2">
          <span className="mono">{bugBerikut.data ?? '…'}</span> · {kasusAktif ? kasusAktif.tcId : 'Di luar scenario'}
        </span>
      }
      onTutup={onTutup}
      kaki={
        <Button blok onKlik={() => void simpan()} nonaktif={menyimpan || executionAktifId === ''}>
          {menyimpan ? 'Menyimpan…' : 'Simpan bug'}
        </Button>
      }
    >
      <div className="col col-16">
        {pilih && (
          <>
            <SelectOpsi
              label="Execution"
              nilai={executionAktifId}
              onUbah={(v) => {
                setExecDipilih(v)
                setTcDipilih('')
              }}
              pilihan={executions.map((e) => ({ nilai: e.id, label: e.judul }))}
            />
            <SearchableSelect
              label="Test case terkait"
              nilai={tcDipilih}
              onUbah={(v) => {
                setTcDipilih(v)
                // Bila actual result belum diisi dan test case yang dipilih punya actual result, bantu isi otomatis
                if (!actual.trim() && v && executionAktif) {
                  const targetTc = executionAktif.kasus.find((k) => k.tcId === v)
                  if (targetTc?.actualResult) {
                    setActual(targetTc.actualResult)
                  }
                }
              }}
              bantuan="Pilih Di luar scenario untuk bug yang tidak berasal dari test case."
              pilihan={[
                {
                  nilai: '',
                  label: 'Di luar scenario',
                  scenario: 'Bug yang tidak terikat pada test case tertentu',
                },
                ...(executionAktif?.kasus ?? []).map((k) => ({
                  nilai: k.tcId,
                  label: k.tcId,
                  tcId: k.tcId,
                  scenario: k.scenario,
                  modul: k.modul,
                  status: k.status,
                  nonaktif: k.bugId !== null,
                  pesanNonaktif: k.bugId ? 'Sudah ada bug' : undefined,
                })),
              ]}
            />
          </>
        )}
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
          {kasusAktif && kasusAktif.evidence.length > 0 && (
            <span className="help">Evidence test case ikut terlampir otomatis.</span>
          )}
          <PemilihEvidence mode="dua" onTambah={(b) => setBaru((d) => [...d, b])} />
        </div>
      </div>
    </Sheet>
  )
}
