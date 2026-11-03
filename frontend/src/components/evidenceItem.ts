import type { Evidence, JenisEvidence } from '../data/dummy.ts'

export interface ItemThumb {
  id: string
  label: string
  jenis: JenisEvidence
  pratinjau: string | null // alamat gambar (hanya foto dan galeri)
  tag?: 'TC' | 'Baru'
}

export function itemThumb(e: Evidence, tag?: 'TC' | 'Baru'): ItemThumb {
  return { id: e.id, label: 'Evidence ' + e.nama, jenis: e.jenis, pratinjau: e.jenis === 'link' ? null : e.url, tag }
}
