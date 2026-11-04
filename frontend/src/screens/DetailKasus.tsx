import { useState } from 'react'
import type { ExecutionLengkap, InputEvidence, KasusExecution, StatusKasus } from '../data/dummy.ts'
import { Button } from '../components/Button.tsx'
import { StatusBadge, Tag } from '../components/Badge.tsx'
import { PemilihEvidence, Thumbs } from '../components/Evidence.tsx'
import { itemThumb } from '../components/evidenceItem.ts'
import { TextArea } from '../components/Fields.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { StatusPicker } from '../components/StatusPicker.tsx'
import { kembalikanKasus, simpanActualResult, setStatusKasus, tambahEvidence, ubahKasus } from '../lib/api.ts'
import { haptic, showAlert, showConfirm } from '../lib/telegram.ts'

interface Props {
  executionId: string
  kasus: KasusExecution
  onUbah: (execution: ExecutionLengkap) => void
  onCatatBug: () => void
  onTutup: () => void
  catatBugTerbuka: boolean
}

// Isi sheet detail satu test case di dalam execution. Semua perubahan hanya berlaku di execution ini.
export function DetailKasus({ executionId, kasus, onUbah, onCatatBug, onTutup, catatBugTerbuka }: Props) {
  const [actual, setActual] = useState(kasus.actualResult)
  const [mengedit, setMengedit] = useState(false)
  const [langkah, setLangkah] = useState(kasus.steps.join('\n'))
  const [expected, setExpected] = useState(kasus.expected)
  const [coba, setCoba] = useState(false)
  const [sibuk, setSibuk] = useState(false)

  async function jalankan(kerja: () => Promise<ExecutionLengkap>) {
    setSibuk(true)
    try {
      onUbah(await kerja())
    } catch (e) {
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Terjadi kesalahan.')
    } finally {
      setSibuk(false)
    }
  }

  function ubahStatus(status: StatusKasus) {
    haptic('pilih')
    void jalankan(() => setStatusKasus(executionId, kasus.tcId, status))
  }

  function mulaiEdit() {
    setLangkah(kasus.steps.join('\n'))
    setExpected(kasus.expected)
    setCoba(false)
    setMengedit(true)
  }

  function simpanEdit() {
    const daftar = langkah
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    setCoba(true)
    if (daftar.length === 0 || expected.trim() === '') {
      haptic('gagal')
      return
    }
    setMengedit(false)
    void jalankan(() => ubahKasus(executionId, kasus.tcId, daftar, expected.trim()))
  }

  async function kembalikan() {
    const ya = await showConfirm('Kembalikan langkah dan expected result ke versi utama?')
    if (!ya) return
    setMengedit(false)
    void jalankan(() => kembalikanKasus(executionId, kasus.tcId))
  }

  return (
    <Sheet
      judul={kasus.tcId}
      subjudul={<span className="t-sm c-2">{kasus.scenario}</span>}
      onTutup={onTutup}
      kaki={
        kasus.bugId ? (
          <div className="row between">
            <span className="t-sm w6">Bug tercatat</span>
            <span className="badge b-fail mono">{kasus.bugId}</span>
          </div>
        ) : (
          <Button
            varian="secondary"
            blok
            ikon="bug"
            nonaktif={catatBugTerbuka}
            onKlik={onCatatBug}
          >
            Catat bug
          </Button>
        )
      }
    >
      <div className="col col-16">
        <div className="row gap-8 wrap">
          <StatusBadge status={kasus.status} />
          {kasus.modul && <Tag>{kasus.modul}</Tag>}
          {kasus.fitur && kasus.fitur !== kasus.modul && <Tag>{kasus.fitur}</Tag>}
          {kasus.refRequirement && <Tag>{kasus.refRequirement}</Tag>}
          <Tag>{kasus.tipe}</Tag>
          <Tag>{kasus.prioritas}</Tag>
          {kasus.diubah && <span className="badge b-primary">Diubah di execution ini</span>}
        </div>

        {(kasus.precondition || kasus.testData) && (
          <dl className="kv">
            {kasus.precondition && (
              <>
                <dt>Precondition</dt>
                <dd>{kasus.precondition}</dd>
              </>
            )}
            {kasus.testData && (
              <>
                <dt>Test Data</dt>
                <dd>{kasus.testData}</dd>
              </>
            )}
          </dl>
        )}

        <section className="col col-8">
          <span className="label">Status hasil</span>
          <StatusPicker nilai={kasus.status} onPilih={ubahStatus} />
        </section>

        <section className="col col-8">
          <div className="row between">
            <span className="label">Langkah &amp; expected result</span>
            {!mengedit && (
              <button type="button" className="tautan" onClick={mulaiEdit}>
                Edit di execution ini
              </button>
            )}
          </div>
          {mengedit ? (
            <div className="col col-8">
              <TextArea
                label="Langkah (satu per baris)"
                nilai={langkah}
                onUbah={setLangkah}
                baris={5}
                galat={coba && langkah.trim() === ''}
              />
              <TextArea label="Expected result" nilai={expected} onUbah={setExpected} baris={3} galat={coba && expected.trim() === ''} />
              {coba && (langkah.trim() === '' || expected.trim() === '') && (
                <span className="help c-fail">Langkah dan expected result tidak boleh kosong.</span>
              )}
              <div className="grid2">
                <Button varian="secondary" kecil onKlik={() => setMengedit(false)}>
                  Batal
                </Button>
                <Button kecil onKlik={simpanEdit} nonaktif={sibuk}>
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            <div className="col col-8">
              <ol className="langkah">
                {kasus.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <div className="col col-4">
                <span className="t-sm c-2">Expected result</span>
                <span className="t-body">{kasus.expected}</span>
              </div>
              {kasus.diubah && (
                <button type="button" className="tautan" onClick={() => void kembalikan()}>
                  Kembalikan ke versi utama
                </button>
              )}
            </div>
          )}
          <span className="help">Perubahan di sini tidak mengubah test case utama.</span>
        </section>

        <section className="col col-8">
          <TextArea
            label="Actual result"
            nilai={actual}
            onUbah={setActual}
            baris={3}
            placeholder="Tuliskan hasil sebenarnya yang terlihat"
          />
          <Button
            varian="soft"
            kecil
            nonaktif={sibuk || actual === kasus.actualResult}
            onKlik={() => void jalankan(() => simpanActualResult(executionId, kasus.tcId, actual.trim()))}
          >
            Simpan actual result
          </Button>
        </section>

        <section className="col col-8">
          <span className="label">Evidence</span>
          {kasus.evidence.length === 0 && <span className="help">Belum ada evidence untuk test case ini.</span>}
          <Thumbs item={kasus.evidence.map((e) => itemThumb(e))} />
          <PemilihEvidence
            mode="tiga"
            onTambah={(b: InputEvidence) => void jalankan(() => tambahEvidence(executionId, kasus.tcId, b))}
          />
        </section>
      </div>
    </Sheet>
  )
}
