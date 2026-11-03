// Ikon bergaya Lucide (stroke 2, ujung bulat), digambar langsung sebagai SVG.

export interface BentukIkon {
  path?: string[]
  lingkaran?: [cx: number, cy: number, r: number][]
  persegi?: [x: number, y: number, lebar: number, tinggi: number, rx: number][]
}

export const IKON = {
  kembali: { path: ['m15 18-6-6 6-6'] },
  maju: { path: ['m9 18 6-6-6-6'] },
  bawah: { path: ['m6 9 6 6 6-6'] },
  tambah: { path: ['M5 12h14', 'M12 5v14'] },
  centang: { path: ['M20 6 9 17l-5-5'] },
  tutup: { path: ['M18 6 6 18', 'm6 6 12 12'] },
  cari: { lingkaran: [[11, 11, 8]], path: ['m21 21-4.3-4.3'] },
  unggah: { path: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'] },
  unduh: { path: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'] },
  spreadsheet: {
    path: [
      'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      'M14 2v4a2 2 0 0 0 2 2h4',
      'M8 13h2',
      'M14 13h2',
      'M8 17h2',
      'M14 17h2',
    ],
  },
  dokumen: {
    path: [
      'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
      'M14 2v4a2 2 0 0 0 2 2h4',
      'M10 9H8',
      'M16 13H8',
      'M16 17H8',
    ],
  },
  papanTambah: {
    persegi: [[8, 2, 8, 4, 1]],
    path: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M12 11v6', 'M9 14h6'],
  },
  mainBulat: { lingkaran: [[12, 12, 10]], path: ['m10 8 6 4-6 4Z'] },
  main: { path: ['m6 3 14 9-14 9Z'] },
  daftar: { path: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'] },
  pensil: { path: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'm15 5 4 4'] },
  kamera: {
    path: ['M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'],
    lingkaran: [[12, 13, 3]],
  },
  gambar: {
    persegi: [[3, 3, 18, 18, 2]],
    lingkaran: [[9, 9, 2]],
    path: ['m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'],
  },
  tautan: {
    path: [
      'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    ],
  },
  bug: {
    path: [
      'm8 2 1.88 1.88',
      'M14.12 3.88 16 2',
      'M9 7.13v-1a3.003 3.003 0 1 1 6 0v1',
      'M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6',
      'M12 20v-9',
      'M6 13H2',
      'M22 13h-4',
    ],
  },
  peringatan: {
    path: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  },
  alertBulat: { lingkaran: [[12, 12, 10]], path: ['M12 8v4', 'M12 16h.01'] },
  silangBulat: { lingkaran: [[12, 12, 10]], path: ['m15 9-6 6', 'm9 9 6 6'] },
  centangBulat: { lingkaran: [[12, 12, 10]], path: ['m9 12 2 2 4-4'] },
  info: { lingkaran: [[12, 12, 10]], path: ['M12 16v-4', 'M12 8h.01'] },
  kirim: { path: ['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13'] },
  larang: { lingkaran: [[12, 12, 10]], path: ['m4.9 4.9 14.2 14.2'] },
  minusBulat: { lingkaran: [[12, 12, 10]], path: ['M8 12h8'] },
  lingkaran: { lingkaran: [[12, 12, 10]] },
  perisai: {
    path: [
      'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      'm9 12 2 2 4-4',
    ],
  },
} satisfies Record<string, BentukIkon>

export type NamaIkon = keyof typeof IKON
