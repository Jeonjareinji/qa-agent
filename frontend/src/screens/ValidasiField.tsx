import { useState } from 'react'
import type { ImportDraft } from '../data/dummy.ts'
import { AppBar } from '../components/AppBar.tsx'
import { Banner } from '../components/Banner.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { Icon } from '../components/Icon.tsx'
import { Galat, Memuat } from '../components/Kosong.tsx'
import { simpanImport, unduhDaftarTemuan, validasiImport } from '../lib/api.ts'
import type { Nav } from '../lib/nav.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

export function ValidasiField({ nav, draft }: { nav: Nav; draft: ImportDraft }) {
  const { data, galat, muatUlang } = useLoad('validasi:' + draft.jenis, () => validasiImport(draft.jenis))
  const [menyimpan, setMenyimpan] = useState(false)

  if (galat) return <Galat pesan={galat} onUlang={muatUlang} />
  if (!data) return <Memuat />

  const error = data.temuan.filter((t) => t.tingkat === 'error')
  const peringatan = data.temuan.filter((t) => t.tingkat === 'peringatan')
  const barisError = new Set(error.map((t) => t.baris)).size

  async function simpan() {
    setMenyimpan(true)
    try {
      const hasil = await simpanImport(draft)
      haptic('sukses')
      nav.ganti({ nama: 'hasilImport', hasil })
    } catch (e) {
      setMenyimpan(false)
      haptic('gagal')
      await showAlert(e instanceof Error ? e.message : 'Gagal menyimpan.')
    }
  }

  async function unduhTemuan() {
    await unduhDaftarTemuan()
    await showAlert('Daftar temuan diunduh (simulasi).')
  }

  return (
    <>
      <AppBar judul="Validasi field" subjudul="Langkah 2 dari 3" onKembali={nav.kembali} />
      <div className="scroll">
        <div className="grid3">
          <div className="stat t-primary">
            <b>{data.jumlahBaris}</b>
            <span>Baris</span>
          </div>
          <div className="stat t-pass">
            <b>{data.jumlahValid}</b>
            <span>Valid</span>
          </div>
          <div className="stat t-fail">
            <b>{barisError}</b>
            <span>Baris error</span>
          </div>
        </div>

        {error.length > 0 ? (
          <Banner jenis="warn">
            <span className="t-sm w6">{barisError} baris tidak akan disimpan.</span>
            <span className="t-sm">Hanya {data.jumlahValid} baris valid yang disimpan. Perbaiki file lalu import ulang untuk sisanya.</span>
          </Banner>
        ) : (
          <Banner jenis="success">
            <span className="t-sm w6">Semua baris valid.</span>
          </Banner>
        )}

        <section className="col col-8">
          <h2 className="t-h2">Header sheet “{data.sheet}”</h2>
          <div className="card rata">
            <div className="daftar">
              {data.header.map((h) => (
                <div key={h.label} className="daftar-item">
                  <Icon nama={h.terisi ? 'centangBulat' : 'peringatan'} className={h.terisi ? 'c-pass' : 'c-warn'} />
                  <span className="t-body grow">{h.label}</span>
                  <span className={'t-sm ' + (h.terisi ? 'c-pass' : 'c-warn')}>{h.terisi ? 'Terisi' : 'Kosong'}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="col col-8">
          <h2 className="t-h2">Field yang dicek ({data.fields.length})</h2>
          <div className="row wrap gap-8">
            {data.fields.map((f) => (
              <span key={f} className="pil">
                {f}
              </span>
            ))}
          </div>
          <span className="help">{data.catatanDiabaikan}</span>
        </section>

        <section className="col col-8">
          <div className="row between">
            <h2 className="t-h2">
              Temuan ({error.length} error, {peringatan.length} peringatan)
            </h2>
          </div>
          {data.temuan.length === 0 ? (
            <span className="t-sm c-2">Tidak ada temuan.</span>
          ) : (
            <div className="card rata">
              <div className="daftar">
                {data.temuan.map((t) => (
                  <div key={t.baris + t.field + t.pesan} className="daftar-item start">
                    <Icon nama={t.tingkat === 'error' ? 'alertBulat' : 'peringatan'} className={t.tingkat === 'error' ? 'c-fail' : 'c-warn'} />
                    <div className="grow col col-4">
                      <span className="t-sm w6">
                        Baris {t.baris} · <span className="mono">{t.id}</span>
                      </span>
                      <span className="t-sm">
                        {t.field}: {t.pesan}
                      </span>
                    </div>
                    <span className={'badge ' + (t.tingkat === 'error' ? 'b-fail' : 'b-blocked')}>
                      {t.tingkat === 'error' ? 'Error' : 'Peringatan'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="tautan" onClick={() => void unduhTemuan()}>
            Unduh daftar temuan
          </button>
        </section>
      </div>
      <BottomBar dua>
        <Button varian="secondary" onKlik={nav.kembali} nonaktif={menyimpan}>
          Perbaiki file
        </Button>
        <Button onKlik={() => void simpan()} nonaktif={menyimpan || data.jumlahValid === 0}>
          {menyimpan ? 'Menyimpan…' : `Simpan ${data.jumlahValid}`}
        </Button>
      </BottomBar>
    </>
  )
}
