import { useState } from 'react'
import { AppBar } from '../components/AppBar.tsx'
import { Tag } from '../components/Badge.tsx'
import { Button } from '../components/Button.tsx'
import { SearchField } from '../components/Fields.tsx'
import { Galat, Kosong, Memuat } from '../components/Kosong.tsx'
import { getKumpulan, unduhExcelKumpulan } from '../lib/api.ts'
import { formatTanggal } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

export function DetailTestCase({ nav, kumpulanId }: { nav: Nav; kumpulanId: string }) {
  const { data, galat, muatUlang } = useLoad('kumpulan:' + kumpulanId, () => getKumpulan(kumpulanId))
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState<string | null>(null)

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />

  const kata = cari.trim().toLowerCase()
  const tampil = data.testCases.filter(
    (t) =>
      kata === '' ||
      t.id.toLowerCase().includes(kata) ||
      t.scenario.toLowerCase().includes(kata) ||
      t.modul.toLowerCase().includes(kata) ||
      t.fitur.toLowerCase().includes(kata),
  )

  async function unduh() {
    try {
      await unduhExcelKumpulan(kumpulanId)
      await showAlert('Excel kumpulan test case berhasil diunduh.')
    } catch (e) {
      await showAlert(e instanceof Error ? e.message : 'Gagal mengunduh Excel.')
    }
  }

  return (
    <>
      <AppBar judul={data.judul} subjudul={`${data.testCases.length} test case · versi ${data.versi}`} onKembali={nav.kembali} />
      <div className="scroll tight">
        <div className="card">
          <dl className="kv">
            <dt>Jenis</dt>
            <dd>{data.jenis === 'software' ? 'Software' : 'Hardware'}</dd>
            <dt>File</dt>
            <dd>{data.namaFile}</dd>
            <dt>Sheet</dt>
            <dd>{data.sheet}</dd>
            <dt>Diimpor</dt>
            <dd>
              {formatTanggal(data.diimporPada)} oleh {data.diimporOlehNama}
            </dd>
            {data.header.map((h) => (
              <div key={h.label} style={{ display: 'contents' }}>
                <dt>{h.label}</dt>
                <dd>{h.nilai}</dd>
              </div>
            ))}
            <dt>Dipakai di</dt>
            <dd>{data.dipakaiDi.length > 0 ? data.dipakaiDi.join(', ') : 'Belum dipakai'}</dd>
          </dl>
        </div>

        <Button varian="soft" blok ikon="unduh" onKlik={() => void unduh()}>
          Unduh Excel
        </Button>
        <SearchField label="Cari test case" placeholder="Cari ID atau scenario" nilai={cari} onUbah={setCari} />

        {tampil.length === 0 ? (
          <Kosong pesan="Tidak ada test case yang cocok." />
        ) : (
          <div className="col muncul">
            {tampil.map((t) => {
              const buka = terbuka === t.id
              return (
                <div key={t.id} className="card col col-8">
                  <button
                    type="button"
                    className="baris-akordeon"
                    aria-expanded={buka}
                    onClick={() => setTerbuka(buka ? null : t.id)}
                    style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', width: '100%', minHeight: 44 }}
                  >
                    <div className="col col-4">
                      <span className="mono t-sm w7">{t.id}</span>
                      <span className="t-body">{t.scenario}</span>
                      <div className="row gap-8 wrap">
                        <Tag>{t.tipe}</Tag>
                        <Tag>{t.prioritas}</Tag>
                        {t.modul && <Tag>{t.modul}</Tag>}
                        {t.fitur && t.fitur !== t.modul && <Tag>{t.fitur}</Tag>}
                        {t.refRequirement && <Tag>{t.refRequirement}</Tag>}
                      </div>
                    </div>
                  </button>
                  {buka && (
                    <div className="col col-8">
                      <dl className="kv">
                        {t.modul && (
                          <>
                            <dt>{t.jenis === 'hardware' ? 'Komponen / Subsistem' : 'Modul / Menu'}</dt>
                            <dd>{t.modul}</dd>
                          </>
                        )}
                        {t.jenis === 'software' && t.fitur && (
                          <>
                            <dt>Fitur</dt>
                            <dd>{t.fitur}</dd>
                          </>
                        )}
                        {t.refRequirement && (
                          <>
                            <dt>Ref Requirement</dt>
                            <dd>{t.refRequirement}</dd>
                          </>
                        )}
                        {t.precondition && (
                          <>
                            <dt>Precondition</dt>
                            <dd>{t.precondition}</dd>
                          </>
                        )}
                        {t.jenis === 'software' && t.testData && (
                          <>
                            <dt>Test Data</dt>
                            <dd>{t.testData}</dd>
                          </>
                        )}
                        {t.jenis === 'hardware' && t.parameterDiukur && (
                          <>
                            <dt>Parameter Diukur</dt>
                            <dd>{t.parameterDiukur}</dd>
                          </>
                        )}
                        {t.jenis === 'hardware' && t.batasLulus && (
                          <>
                            <dt>Batas Lulus</dt>
                            <dd>{[t.batasLulus, t.satuan].filter(Boolean).join(' ')}</dd>
                          </>
                        )}
                      </dl>
                      <div className="col col-4">
                        <span className="t-sm c-2">Test Steps</span>
                        <ol className="langkah">
                          {t.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="col col-4">
                        <span className="t-sm c-2">Expected Result</span>
                        <span className="t-body">{t.expected}</span>
                      </div>
                    </div>
                  )}
                  <Button
                    varian="secondary"
                    kecil
                    ikon="pensil"
                    onKlik={() => nav.buka({ nama: 'editTestCase', kumpulanId, tcId: t.id })}
                  >
                    Edit
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
