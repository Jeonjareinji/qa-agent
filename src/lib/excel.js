// Ubah baris Excel (array of array) menjadi test case. Header dikenali otomatis.
export function rowsToCases(rows) {
  rows = rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  if (rows.length < 2) return [];
  const h = rows[0].map((c) => String(c).toLowerCase());
  const find = (re) => h.findIndex((x) => re.test(x));
  const iId = find(/^(id|no|kode|tc)/);
  const iSt = find(/step|langkah/);
  const iEx = find(/expected|harapan|hasil/);
  let iSc = find(/scenario|skenario|judul|title|nama|summary/);
  if (iSc < 0) iSc = iId === 0 ? 1 : 0;
  return rows.slice(1).map((r, i) => ({
    id: String(iId >= 0 && r[iId] !== '' ? r[iId] : 'TC-' + String(i + 1).padStart(3, '0')),
    sc: String(r[iSc] ?? ''),
    st: iSt >= 0 ? String(r[iSt]) : '',
    ex: iEx >= 0 ? String(r[iEx]) : '',
  })).filter((c) => c.sc);
}

// Library xlsx dimuat hanya saat dibutuhkan (dynamic import) supaya halaman awal ringan.
export async function parseExcelFile(file) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  return rowsToCases(rows);
}
