// Menghitung busur donut dari daftar jumlah. Dipakai orb di Beranda dan donut di daftar.

export interface ItemBusur {
  kunci: string
  jumlah: number
}

export interface Busur {
  kunci: string
  panjang: number // panjang garis busur (sudah dikurangi celah)
  offset: number // pergeseran awal busur (negatif)
  porsi: number // 0..1
  sudut: number // sudut tengah busur dalam radian, 0 = atas, searah jarum jam
}

export function hitungBusur(item: ItemBusur[], jari: number, celah = 4): Busur[] {
  const keliling = 2 * Math.PI * jari
  const total = item.reduce((a, b) => a + b.jumlah, 0)
  if (total === 0) return []
  let kumulatif = 0
  return item
    .filter((i) => i.jumlah > 0)
    .map((i) => {
      const porsi = i.jumlah / total
      const busur: Busur = {
        kunci: i.kunci,
        panjang: Math.max(porsi * keliling - celah, 1),
        offset: -kumulatif * keliling,
        porsi,
        sudut: (kumulatif + porsi / 2) * 2 * Math.PI,
      }
      kumulatif += porsi
      return busur
    })
}
