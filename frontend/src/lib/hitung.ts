// Fungsi hitung dan format kecil yang dipakai banyak layar.
import { DAFTAR_STATUS } from '../data/dummy.ts'
import type { KasusExecution, StatusExecution, StatusKasus, TestExecution } from '../data/dummy.ts'

export function hitungStatus(kasus: KasusExecution[]): Record<StatusKasus, number> {
  const hasil: Record<StatusKasus, number> = { Pass: 0, Fail: 0, Blocked: 0, 'N/A': 0, 'Not Run': 0 }
  for (const k of kasus) hasil[k.status] += 1
  return hasil
}

export function jumlahDieksekusi(kasus: KasusExecution[]): number {
  const hitung = hitungStatus(kasus)
  return DAFTAR_STATUS.filter((s) => s !== 'Not Run').reduce((total, s) => total + hitung[s], 0)
}

export function statusExecution(e: TestExecution): StatusExecution {
  if (e.selesai) return 'selesai'
  return jumlahDieksekusi(e.kasus) === 0 ? 'belum' : 'berjalan'
}

export function persen(bagian: number, total: number): number {
  return total === 0 ? 0 : Math.round((bagian / total) * 100)
}

const formatTanggalPendek = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatTanggal(iso: string): string {
  return formatTanggalPendek.format(new Date(iso))
}

export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean)
  if (kata.length === 0) return '?'
  if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase()
  return (kata[0][0] + kata[kata.length - 1][0]).toUpperCase()
}

export function slug(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function kelasStatus(status: StatusKasus): string {
  switch (status) {
    case 'Pass':
      return 'pass'
    case 'Fail':
      return 'fail'
    case 'Blocked':
      return 'blocked'
    case 'N/A':
      return 'na'
    case 'Not Run':
      return 'notrun'
  }
}
