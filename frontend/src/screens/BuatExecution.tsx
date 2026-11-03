import { useState } from 'react'
import { AppBar } from '../components/AppBar.tsx'
import { BottomBar } from '../components/BottomBar.tsx'
import { Button } from '../components/Button.tsx'
import { TextField } from '../components/Fields.tsx'
import { Galat, Kosong, Memuat } from '../components/Kosong.tsx'
import { PilihBaris } from '../components/Pilih.tsx'
import { Tag } from '../components/Badge.tsx'
import { buatExecution, getUsers, listKumpulan } from '../lib/api.ts'
import { formatTanggal, inisial } from '../lib/hitung.ts'
import type { Nav } from '../lib/nav.ts'
import { haptic, showAlert } from '../lib/telegram.ts'
import { useLoad } from '../lib/useLoad.ts'

function bolak(daftar: string[], id: string): string[] {
  return daftar.includes(id) ? daftar.filter((x) => x !== id) : [...daftar, id]
}

export function BuatExecution({ nav }: { nav: Nav }) {
  const kumpulan = useLoad('kumpulan', listKumpulan)
  const users = useLoad('users', getUsers)
  const [judul, setJudul] = useState('')
  const [kumpulanIds, setKumpulanIds] = useState<string[]>([])
  const [picIds, setPicIds] = useState<string[]>([])
  const [coba, setCoba] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)

  if (kumpulan.galat) return <Galat pesan={kumpulan.galat} onUlang={kumpulan.muatUlang} />
  if (users.galat) return <Galat pesan={users.galat} onUlang={users.muatUlang} />
  if (!kumpulan.data || !users.data) return <Memuat />

  const judulKosong = judul.trim() === ''
  const tanpaKumpulan = kumpulanIds.length === 0
  const totalKasus = kumpulan.data.filter((k) => kumpulanIds.includes(k.id)).reduce((n, k) => n + k.jumlah, 0)

  async function buat() {
    setCoba(true)
    if (judulKosong || tanpaKumpulan) {
      haptic('gagal')
      return
    }
    setMenyimpan(true)
    try {
      const e = await buatExecution({ judul: judul.trim(), kumpulanIds, picIds })
      haptic('sukses')
      nav.ganti({ nama: 'hasilExecution', executionId: e.id })
    } catch (err) {
      setMenyimpan(false)
      haptic('gagal')
      await showAlert(err instanceof Error ? err.message : 'Gagal membuat execution.')
    }
  }

  return (
    <>
      <AppBar judul="Buat Test Execution" onKembali={nav.kembali} />
      <div className="scroll">
        <TextField
          label="Judul execution"
          nilai={judul}
          onUbah={setJudul}
          placeholder="Contoh: Regression Sprint 12"
          galat={coba && judulKosong}
        />
        {coba && judulKosong && <span className="help c-fail">Judul wajib diisi.</span>}

        <section className="col col-8">
          <div className="row between">
            <h2 className="t-h2">Kumpulan test case</h2>
            <span className="t-sm c-2">{kumpulanIds.length} dipilih</span>
          </div>
          {kumpulan.data.length === 0 ? (
            <Kosong pesan="Belum ada test case. Import dulu dari menu Import Test Case." />
          ) : (
            kumpulan.data.map((k) => (
              <PilihBaris
                key={k.id}
                terpilih={kumpulanIds.includes(k.id)}
                onKlik={() => {
                  setKumpulanIds((d) => bolak(d, k.id))
                  haptic('pilih')
                }}
              >
                <span className="t-body w6">{k.judul}</span>
                <span className="row gap-8 wrap">
                  <Tag>{k.jenis === 'software' ? 'Software' : 'Hardware'}</Tag>
                  <span className="t-cap">
                    {k.jumlah} test case · {formatTanggal(k.diimporPada)}
                  </span>
                </span>
              </PilihBaris>
            ))
          )}
          {coba && tanpaKumpulan && <span className="help c-fail">Pilih minimal satu kumpulan test case.</span>}
        </section>

        <section className="col col-8">
          <div className="row between">
            <h2 className="t-h2">PIC pengetes</h2>
            <span className="t-sm c-2">Opsional</span>
          </div>
          {users.data.map((u) => (
            <PilihBaris
              key={u.id}
              terpilih={picIds.includes(u.id)}
              cekDi="kanan"
              awal={<span className="avatar">{inisial(u.nama)}</span>}
              onKlik={() => {
                setPicIds((d) => bolak(d, u.id))
                haptic('pilih')
              }}
            >
              <span className="t-body w6">{u.nama}</span>
              <span className="t-cap">
                {u.peran} · {u.username}
              </span>
            </PilihBaris>
          ))}
        </section>
      </div>
      <BottomBar petunjuk={totalKasus > 0 ? `${totalKasus} test case akan disalin ke execution ini` : undefined}>
        <Button blok onKlik={() => void buat()} nonaktif={menyimpan}>
          {menyimpan ? 'Membuat…' : 'Buat execution'}
        </Button>
      </BottomBar>
    </>
  )
}
