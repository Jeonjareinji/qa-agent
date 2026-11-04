import type { Evidence, JenisEvidence } from '../data/dummy.ts'

export interface ItemThumb {
  id: string
  label: string
  nama: string
  jenis: JenisEvidence
  pratinjau: string | null // alamat media (foto, galeri, video); null kalau tidak ada pratinjau
  tautan: string | null // hanya untuk jenis link
  tag?: 'TC' | 'Baru'
}

export function itemThumb(e: Evidence, tag?: 'TC' | 'Baru'): ItemThumb {
  return {
    id: e.id,
    label: 'Evidence ' + e.nama,
    nama: e.nama,
    jenis: e.jenis,
    pratinjau: e.jenis === 'link' ? null : e.url,
    tautan: e.jenis === 'link' ? e.url : null,
    tag,
  }
}
