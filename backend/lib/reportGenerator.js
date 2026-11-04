import * as XLSX from 'xlsx';
import { cleanAscii, SimplePdf } from './pdf.js';

function formatTgl(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function wrapText(text, maxChars = 84) {
  if (!text) return [];
  const words = cleanAscii(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function generateExcelReport(execution, bugs = [], options = {}) {
  const wb = XLSX.utils.book_new();

  const kasusList = execution.kasus || [];
  const hitung = { Pass: 0, Fail: 0, Blocked: 0, 'N/A': 0, 'Not Run': 0 };
  for (const k of kasusList) {
    if (hitung[k.status] !== undefined) hitung[k.status]++;
    else hitung['Not Run']++;
  }
  const totalCases = kasusList.length;
  const dieksekusi = totalCases - hitung['Not Run'];
  const passRate = dieksekusi > 0 ? Math.round((hitung.Pass / dieksekusi) * 100) : 0;

  // 1. Sheet Summary
  const summaryAoa = [
    ['QA AGENT — TEST EXECUTION REPORT'],
    [],
    ['INFORMASI PENGUJIAN'],
    ['Judul Execution', execution.judul || execution.title || '-'],
    ['Kode Execution', execution.code || '-'],
    ['Jenis Testing', (execution.jenis || execution.kind || 'software').toUpperCase()],
    ['Status', execution.selesai ? 'Done' : execution.status || 'Running'],
    ['Versi Build / Release', execution.build_version || '-'],
    ['Environment', execution.environment || '-'],
    ['Tester / PIC', (execution.picNama || []).join(', ') || execution.dibuatOlehNama || '-'],
    ['Waktu Mulai', formatTgl(execution.dibuatPada || execution.created_at)],
    ['Waktu Selesai', formatTgl(execution.completed_at)],
    [],
    ['RINGKASAN METRIK'],
    ['Total Test Case', totalCases],
    ['Dieksekusi', dieksekusi],
    ['Pass Rate', `${passRate}%`],
    ['Pass', hitung.Pass],
    ['Fail', hitung.Fail],
    ['Blocked', hitung.Blocked],
    ['N/A', hitung['N/A']],
    ['Not Run', hitung['Not Run']],
  ];

  if (bugs.length > 0) {
    summaryAoa.push([], ['DAFTAR BUG TERCATAT'], ['Bug ID', 'Judul', 'Severity', 'Prioritas', 'Status', 'Tipe', 'TC ID', 'Actual Result']);
    for (const b of bugs) {
      summaryAoa.push([
        b.id || '',
        b.judul || b.title || '',
        b.severity || 'Major',
        b.prioritas || b.priority || 'Medium',
        b.status || 'Open',
        b.tipe || b.bug_type || 'Functional',
        b.tcId || b.tc_id || '-',
        b.actualResult || b.actual_result || '',
      ]);
    }
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 24 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // 2. Sheet Detail Test Case
  const isSoftware = (execution.jenis || execution.kind) === 'software';
  const headers = isSoftware
    ? [
        'No',
        'TC ID',
        'Modul / Menu',
        'Fitur',
        'Ref Requirement',
        'Scenario',
        'Tipe',
        'Priority',
        'Precondition',
        'Test Data',
        'Test Steps',
        'Expected Result',
        'Status',
        'Actual Result',
        'Evidence',
        'Bug ID',
      ]
    : [
        'No',
        'TC ID',
        'Komponen / Subsistem',
        'Scenario',
        'Tipe',
        'Criticality',
        'Precondition',
        'Test Steps',
        'Expected Result',
        'Status',
        'Actual Result',
        'Evidence',
        'Bug ID',
      ];

  const detailAoa = [headers];
  kasusList.forEach((k, idx) => {
    const stepsStr = Array.isArray(k.steps) ? k.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : String(k.steps || '');
    const evidenceStr = (k.evidence || []).map((e) => (typeof e === 'string' ? e : e.url || e.nama || '')).filter(Boolean).join('\n');

    if (isSoftware) {
      detailAoa.push([
        idx + 1,
        k.tcId || '',
        k.modul || '',
        k.fitur || '',
        k.refRequirement || '',
        k.scenario || '',
        k.tipe || 'Positive',
        k.prioritas || 'Medium',
        k.precondition || '',
        k.testData || '',
        options.sertakanLangkah !== false ? stepsStr : '[Langkah disembunyikan]',
        k.expected || '',
        k.status || 'Not Run',
        options.sertakanActual !== false ? k.actualResult || '' : '',
        options.sertakanEvidence !== false ? evidenceStr : '',
        k.bugId || '',
      ]);
    } else {
      detailAoa.push([
        idx + 1,
        k.tcId || '',
        k.modul || '',
        k.scenario || '',
        k.tipe || 'Positive',
        k.prioritas || 'Medium',
        k.precondition || '',
        options.sertakanLangkah !== false ? stepsStr : '[Langkah disembunyikan]',
        k.expected || '',
        k.status || 'Not Run',
        options.sertakanActual !== false ? k.actualResult || '' : '',
        options.sertakanEvidence !== false ? evidenceStr : '',
        k.bugId || '',
      ]);
    }
  });

  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoa);
  wsDetail['!cols'] = isSoftware
    ? [
        { wch: 5 },
        { wch: 14 },
        { wch: 20 },
        { wch: 18 },
        { wch: 16 },
        { wch: 35 },
        { wch: 10 },
        { wch: 10 },
        { wch: 25 },
        { wch: 20 },
        { wch: 40 },
        { wch: 35 },
        { wch: 10 },
        { wch: 30 },
        { wch: 25 },
        { wch: 12 },
      ]
    : [
        { wch: 5 },
        { wch: 14 },
        { wch: 22 },
        { wch: 35 },
        { wch: 10 },
        { wch: 12 },
        { wch: 25 },
        { wch: 40 },
        { wch: 35 },
        { wch: 10 },
        { wch: 30 },
        { wch: 25 },
        { wch: 12 },
      ];

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Execution');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export function generatePdfReport(execution, bugs = [], options = {}) {
  const doc = new SimplePdf();
  const kasusList = execution.kasus || [];

  const hitung = { Pass: 0, Fail: 0, Blocked: 0, 'N/A': 0, 'Not Run': 0 };
  for (const k of kasusList) {
    if (hitung[k.status] !== undefined) hitung[k.status]++;
    else hitung['Not Run']++;
  }
  const totalCases = kasusList.length;
  const dieksekusi = totalCases - hitung['Not Run'];
  const passRate = dieksekusi > 0 ? Math.round((hitung.Pass / dieksekusi) * 100) : 0;

  // 1. Header Banner (Clean Rounded Brand Header)
  doc.setFillColor(0.08, 0.64, 0.75).roundedRect(36, 36, 523, 42, 6, true, false);
  doc.text('QA AGENT | TEST EXECUTION REPORT', 48, 62, { size: 12.5, font: 'F2', color: [1, 1, 1] });
  const tglCetak = `Generated: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  doc.textRight(tglCetak, 547, 62, { size: 8.5, font: 'F1', color: [0.92, 0.97, 1] });

  // 2. Title & Code Subtitle
  let y = 98;
  const titleText = cleanAscii(execution.judul || execution.title || 'Test Execution');
  doc.text(titleText, 36, y, { size: 18, font: 'F2', color: [0.04, 0.1, 0.14] });
  y += 20;

  const codeSubtitle = `${cleanAscii(execution.code || 'EXE')} | ${cleanAscii(String(execution.jenis || 'software').toUpperCase())} TESTING`;
  doc.text(codeSubtitle, 36, y, { size: 9.5, font: 'F1', color: [0.35, 0.44, 0.5] });
  y += 18;

  // 3. Info Box (2-Column Key-Value Card with Aligned Grid)
  doc.setFillColor(0.965, 0.98, 0.99).setStrokeColor(0.82, 0.88, 0.92).roundedRect(36, y, 523, 66, 5, true, true);

  const col1L = 48;
  const col1V = 125;
  const col2L = 295;
  const col2V = 375;

  const r1Y = y + 16;
  const r2Y = y + 33;
  const r3Y = y + 50;

  doc.text('Build / Versi', col1L, r1Y, { size: 8.5, font: 'F2', color: [0.32, 0.42, 0.48] });
  doc.text(': ' + cleanAscii(execution.build_version || '-'), col1V, r1Y, { size: 8.5, font: 'F1', color: [0.05, 0.1, 0.15] });

  doc.text('Environment', col1L, r2Y, { size: 8.5, font: 'F2', color: [0.32, 0.42, 0.48] });
  doc.text(': ' + cleanAscii(execution.environment || '-'), col1V, r2Y, { size: 8.5, font: 'F1', color: [0.05, 0.1, 0.15] });

  doc.text('Tester / PIC', col1L, r3Y, { size: 8.5, font: 'F2', color: [0.32, 0.42, 0.48] });
  const pic = (execution.picNama || []).join(', ') || execution.dibuatOlehNama || '-';
  doc.text(': ' + cleanAscii(pic.slice(0, 30)), col1V, r3Y, { size: 8.5, font: 'F1', color: [0.05, 0.1, 0.15] });

  doc.text('Waktu Mulai', col2L, r1Y, { size: 8.5, font: 'F2', color: [0.32, 0.42, 0.48] });
  doc.text(': ' + cleanAscii(formatTgl(execution.dibuatPada || execution.created_at)), col2V, r1Y, { size: 8.5, font: 'F1', color: [0.05, 0.1, 0.15] });

  doc.text('Waktu Selesai', col2L, r2Y, { size: 8.5, font: 'F2', color: [0.32, 0.42, 0.48] });
  doc.text(': ' + cleanAscii(formatTgl(execution.completed_at)), col2V, r2Y, { size: 8.5, font: 'F1', color: [0.05, 0.1, 0.15] });

  doc.text('Status Akhir', col2L, r3Y, { size: 8.5, font: 'F2', color: [0.32, 0.42, 0.48] });
  doc.text(': ', col2V, r3Y, { size: 8.5, font: 'F1', color: [0.05, 0.1, 0.15] });
  const isDone = execution.selesai || execution.status === 'Done';
  doc.text(isDone ? 'Done' : 'Running', col2V + 8, r3Y, {
    size: 8.5,
    font: 'F2',
    color: isDone ? [0.08, 0.64, 0.29] : [0.88, 0.54, 0],
  });

  y += 82;

  // 4. KPI Metric Cards (Centered text, balanced width)
  doc.text('RINGKASAN METRIK HASIL', 36, y, { size: 10.5, font: 'F2', color: [0.04, 0.1, 0.14] });
  y += 12;

  const cards = [
    { label: 'TOTAL', val: String(totalCases), bg: [0.94, 0.96, 0.97], border: [0.85, 0.89, 0.92], fg: [0.08, 0.18, 0.24] },
    { label: 'PASS RATE', val: `${passRate}%`, bg: [0.91, 0.97, 0.93], border: [0.76, 0.9, 0.8], fg: [0.07, 0.55, 0.25] },
    { label: 'PASS', val: String(hitung.Pass), bg: [0.91, 0.97, 0.93], border: [0.76, 0.9, 0.8], fg: [0.07, 0.55, 0.25] },
    { label: 'FAIL', val: String(hitung.Fail), bg: [0.99, 0.92, 0.92], border: [0.96, 0.78, 0.78], fg: [0.86, 0.15, 0.15] },
    { label: 'BLOCKED', val: String(hitung.Blocked), bg: [1, 0.96, 0.88], border: [0.98, 0.88, 0.72], fg: [0.88, 0.54, 0] },
  ];
  if (hitung['N/A'] > 0) {
    cards.push({ label: 'N/A', val: String(hitung['N/A']), bg: [0.92, 0.95, 0.98], border: [0.82, 0.88, 0.94], fg: [0.28, 0.45, 0.6] });
  }
  cards.push({ label: 'NOT RUN', val: String(hitung['Not Run']), bg: [0.93, 0.94, 0.96], border: [0.84, 0.87, 0.9], fg: [0.35, 0.42, 0.48] });

  const numCards = cards.length;
  const gap = 5.5;
  const cardW = (523 - (numCards - 1) * gap) / numCards;
  const cardH = 44;

  cards.forEach((c, idx) => {
    const cx = 36 + idx * (cardW + gap);
    doc.setFillColor(...c.bg).setStrokeColor(...c.border).roundedRect(cx, y, cardW, cardH, 4, true, true);
    doc.textCenter(c.val, cx, y + 18, cardW, { size: 14, font: 'F2', color: c.fg });
    doc.textCenter(c.label, cx, y + 33, cardW, { size: 7.5, font: 'F2', color: [0.42, 0.5, 0.56] });
  });

  y += 58;

  // 5. Bugs section (if present)
  if (bugs.length > 0) {
    doc.text(`DAFTAR BUG TERCATAT (${bugs.length})`, 36, y, { size: 10.5, font: 'F2', color: [0.86, 0.15, 0.15] });
    y += 12;

    bugs.slice(0, 8).forEach((b) => {
      doc.setFillColor(0.99, 0.96, 0.96).setStrokeColor(0.95, 0.86, 0.86).roundedRect(36, y, 523, 22, 3.5, true, true);
      
      // Bug ID badge
      doc.setFillColor(0.98, 0.9, 0.9).setStrokeColor(0.94, 0.76, 0.76).roundedRect(42, y + 4.5, 54, 13, 2.5, true, true);
      doc.textCenter(cleanAscii(b.id || 'BUG'), 42, y + 8, 54, { size: 7.5, font: 'F2', color: [0.82, 0.12, 0.12] });

      // Bug title
      doc.text(cleanAscii((b.judul || b.title || '').slice(0, 52)), 104, y + 7, { size: 8.5, font: 'F1', color: [0.1, 0.14, 0.18] });

      // Severity badge
      const sev = cleanAscii(b.severity || 'Major');
      doc.setFillColor(1, 0.92, 0.92).setStrokeColor(0.95, 0.78, 0.78).roundedRect(420, y + 4.5, 54, 13, 2.5, true, true);
      doc.textCenter(sev, 420, y + 8.2, 54, { size: 7, font: 'F2', color: [0.8, 0.15, 0.15] });

      // Status badge
      const st = cleanAscii(b.status || 'Open');
      doc.setFillColor(0.94, 0.95, 0.97).setStrokeColor(0.85, 0.88, 0.92).roundedRect(480, y + 4.5, 72, 13, 2.5, true, true);
      doc.textCenter(st, 480, y + 8.2, 72, { size: 7, font: 'F2', color: [0.3, 0.38, 0.46] });

      y += 26;
    });
    y += 6;
  }

  // 6. Detail Test Case List (Clean Structured Card with Status Accent Strip)
  doc.text(`DETAIL TEST CASES (${totalCases})`, 36, y, { size: 10.5, font: 'F2', color: [0.04, 0.1, 0.14] });
  y += 12;

  const stConfig = {
    Pass: {
      accent: [0.09, 0.64, 0.29],
      pillBg: [0.88, 0.96, 0.9],
      pillBorder: [0.74, 0.89, 0.78],
      pillFg: [0.07, 0.52, 0.23],
    },
    Fail: {
      accent: [0.86, 0.15, 0.15],
      pillBg: [0.98, 0.89, 0.89],
      pillBorder: [0.95, 0.75, 0.75],
      pillFg: [0.82, 0.12, 0.12],
    },
    Blocked: {
      accent: [0.88, 0.54, 0],
      pillBg: [1, 0.95, 0.85],
      pillBorder: [0.98, 0.86, 0.68],
      pillFg: [0.82, 0.48, 0],
    },
    'N/A': {
      accent: [0.42, 0.53, 0.66],
      pillBg: [0.9, 0.93, 0.96],
      pillBorder: [0.8, 0.85, 0.9],
      pillFg: [0.28, 0.38, 0.48],
    },
    'Not Run': {
      accent: [0.62, 0.66, 0.72],
      pillBg: [0.92, 0.93, 0.95],
      pillBorder: [0.82, 0.85, 0.88],
      pillFg: [0.35, 0.4, 0.46],
    },
  };

  kasusList.forEach((k) => {
    const scLines = wrapText(k.scenario, 90).slice(0, 2);
    const expLines = wrapText(k.expected, 95).slice(0, 2);
    const hasActual = Boolean(options.sertakanActual !== false && k.actualResult);
    const actLines = hasActual ? wrapText(k.actualResult, 95).slice(0, 2) : [];
    const hasBug = Boolean(k.bugId);

    // Hitung tinggi card secara dinamis dan presisi
    let contentH = 26; // margin atas hingga baris skenario
    contentH += scLines.length * 12;
    contentH += expLines.length * 11;
    if (actLines.length > 0) {
      contentH += 3 + actLines.length * 11;
    }
    if (hasBug) {
      contentH += 3 + 14;
    }
    contentH += 9; // padding bawah
    const cardH = contentH;

    // Page Break jika melebihi batas bawah halaman
    if (y + cardH > 788) {
      doc.newPage();
      y = 40;
      doc.text('DETAIL TEST CASES (Lanjutan)', 36, y, { size: 9.5, font: 'F2', color: [0.25, 0.35, 0.42] });
      y += 14;
    }

    const cfg = stConfig[k.status] || stConfig['Not Run'];

    // Box Utama Card (Background Putih Bersih dengan Border Halus)
    doc.setFillColor(1, 1, 1).setStrokeColor(0.86, 0.9, 0.93).roundedRect(36, y, 523, cardH, 4, true, true);

    // Accent Stripe di Sisi Kiri (Inner rounded bar yang rapi dan proporsional)
    doc.setFillColor(...cfg.accent).roundedRect(41, y + 5, 3.5, Math.max(14, cardH - 10), 1.75, true, false);

    // Baris 1: Status Pill
    const pillW = 50;
    const pillH = 14;
    doc.setFillColor(...cfg.pillBg).setStrokeColor(...cfg.pillBorder).roundedRect(50, y + 5.5, pillW, pillH, 3, true, true);
    doc.textCenter(k.status || 'Not Run', 50, y + 9.5, pillW, { size: 7.5, font: 'F2', color: cfg.pillFg });

    // TC ID (Bold & Jelas)
    doc.text(cleanAscii(k.tcId || 'TC'), 108, y + 8.5, { size: 9.5, font: 'F2', color: [0.06, 0.14, 0.2] });

    // Modul Tag Badge
    if (k.modul) {
      const modText = cleanAscii(k.modul);
      const modW = Math.min(160, Math.max(50, modText.length * 5.2 + 14));
      doc.setFillColor(0.95, 0.96, 0.98).setStrokeColor(0.85, 0.88, 0.92).roundedRect(170, y + 5.5, modW, 14, 3, true, true);
      doc.textCenter(modText, 170, y + 9.5, modW, { size: 7.5, font: 'F1', color: [0.28, 0.38, 0.46] });
    }

    // Type & Priority Tag (Sisi Kanan)
    const typePrio = [k.tipe, k.prioritas].filter(Boolean).join(' | ');
    if (typePrio) {
      doc.textRight(cleanAscii(typePrio), 548, y + 9, { size: 7.5, font: 'F2', color: [0.45, 0.52, 0.58] });
    }

    // Baris 2: Skenario Pengujian (Teks Utama)
    let cy = y + 26;
    scLines.forEach((line) => {
      doc.text(line, 50, cy, { size: 8.5, font: 'F2', color: [0.08, 0.12, 0.16] });
      cy += 12;
    });

    // Baris 3: Expected Result
    expLines.forEach((line, li) => {
      const prefix = li === 0 ? 'Expected: ' : '          ';
      doc.text(prefix + line, 50, cy, { size: 8, font: 'F1', color: [0.38, 0.46, 0.52] });
      cy += 11;
    });

    // Baris 4: Actual Result (jika ada)
    if (actLines.length > 0) {
      cy += 3;
      actLines.forEach((line, li) => {
        const prefix = li === 0 ? 'Actual: ' : '        ';
        doc.text(prefix + line, 50, cy, {
          size: 8,
          font: 'F2',
          color: k.status === 'Fail' ? [0.82, 0.12, 0.12] : [0.18, 0.28, 0.35],
        });
        cy += 11;
      });
    }

    // Baris 5: Bug ID Badge (jika ada)
    if (hasBug) {
      cy += 3;
      doc.setFillColor(0.99, 0.91, 0.91).setStrokeColor(0.96, 0.78, 0.78).roundedRect(50, cy - 1, 72, 13, 2.5, true, true);
      doc.textCenter('Bug: ' + cleanAscii(k.bugId), 50, cy + 2.5, 72, { size: 7.5, font: 'F2', color: [0.82, 0.12, 0.12] });
      cy += 14;
    }

    y += cardH + 5;
  });

  return doc.buildBuffer();
}
