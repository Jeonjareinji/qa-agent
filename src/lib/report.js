import { tg } from './telegram.js';
import { countResults } from './constants.js';

const COLORS = { Pass: [20, 97, 47], Fail: [156, 28, 20], Blocked: [122, 75, 0], Skip: [61, 72, 82] };

// Font PDF bawaan hanya mendukung Latin-1 + tanda baca umum; karakter lain diganti "?"
const safe = (s) => String(s ?? '').replace(/[^\t\n\r\x20-\x7E\xA0-\xFF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026]/g, '?');

const colorCell = (col) => (h) => {
  if (h.section === 'body' && h.column.index === col) {
    h.cell.styles.fontStyle = 'bold';
    h.cell.styles.textColor = COLORS[h.cell.raw] || [90, 90, 90];
  }
};

export function reportFileName(title, date = new Date()) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'execution';
  return `report-${slug}-${date.toISOString().slice(0, 10)}.pdf`;
}

export async function generateReport(e) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const d = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = d.internal.pageSize.getWidth();
  const H = d.internal.pageSize.getHeight();
  const M = 40;
  const c = countResults(e);
  const n = e.cases.length;
  const u = tg?.initDataUnsafe?.user;
  const by = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '';
  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  d.setFont('helvetica', 'bold'); d.setFontSize(18); d.text('Laporan Pengujian', M, 52);
  d.setFontSize(13);
  const tl = d.splitTextToSize(safe(e.title), W - 2 * M);
  d.text(tl, M, 76);
  let y = 76 + tl.length * 16;
  d.setFont('helvetica', 'normal'); d.setFontSize(10); d.setTextColor(80);
  d.text('Tanggal: ' + tgl + (by ? '   |   Penguji: ' + safe(by) : ''), M, y);
  y += 18;

  const base = {
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [26, 111, 179], textColor: 255 },
    margin: { left: M, right: M },
  };

  autoTable(d, {
    ...base, startY: y,
    head: [['Total', 'Pass', 'Fail', 'Blocked', 'Skip', 'Belum dinilai', 'Pass rate']],
    body: [[n, c.Pass, c.Fail, c.Blocked, c.Skip, n - c.rated, (n ? Math.round((c.Pass / n) * 100) : 0) + '%']],
    styles: { ...base.styles, halign: 'center', fontSize: 10 },
  });
  y = d.lastAutoTable.finalY + 22;

  d.setTextColor(0); d.setFont('helvetica', 'bold'); d.setFontSize(12);
  d.text('Hasil per test case', M, y);
  autoTable(d, {
    ...base, startY: y + 8,
    head: [['No', 'ID', 'Scenario', 'Status', 'Catatan']],
    body: e.cases.map((x, i) => [i + 1, safe(x.id), safe(x.sc), x.s || 'Belum dinilai', safe(x.note)]),
    columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 52 }, 3: { cellWidth: 62 } },
    didParseCell: colorCell(3),
  });

  const bad = e.cases.filter((x) => x.s === 'Fail' || x.s === 'Blocked');
  if (bad.length) {
    y = d.lastAutoTable.finalY + 22;
    if (y > H - 120) { d.addPage(); y = M + 10; }
    d.setTextColor(0); d.setFont('helvetica', 'bold'); d.setFontSize(12);
    d.text('Detail Fail dan Blocked', M, y);
    autoTable(d, {
      ...base, startY: y + 8,
      head: [['ID / Scenario', 'Status', 'Langkah', 'Hasil diharapkan', 'Catatan']],
      body: bad.map((x) => [safe(x.id + '\n' + x.sc), x.s, safe(x.st), safe(x.ex), safe(x.note)]),
      columnStyles: { 1: { cellWidth: 50 } },
      didParseCell: colorCell(1),
    });
  }

  const pages = d.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    d.setPage(i); d.setFont('helvetica', 'normal'); d.setFontSize(8); d.setTextColor(120);
    d.text('QA Agent', M, H - 20);
    d.text(`Halaman ${i} dari ${pages}`, W - M, H - 20, { align: 'right' });
  }

  const buf = d.output('arraybuffer');
  return { name: reportFileName(e.title, now), buf, blob: new Blob([buf], { type: 'application/pdf' }) };
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Di browser biasa: unduh/bagikan. Di WebView Telegram, unduhan sering diblokir (pakai viewer di dalam app).
export function deliver({ blob, name }) {
  try {
    const f = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [f] })) {
      navigator.share({ files: [f], title: name }).catch((err) => { if (err?.name !== 'AbortError') download(blob, name); });
      return;
    }
  } catch { /* lanjut ke unduh biasa */ }
  download(blob, name);
}
