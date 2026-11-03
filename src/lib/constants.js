export const STATUSES = ['Pass', 'Fail', 'Blocked', 'Skip'];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const today = () =>
  new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

// Hitung hasil per status; rated = jumlah test case yang sudah dinilai.
export function countResults(exec) {
  const c = { Pass: 0, Fail: 0, Blocked: 0, Skip: 0, rated: 0 };
  exec.cases.forEach((x) => { if (x.s) { c[x.s]++; c.rated++; } });
  return c;
}
