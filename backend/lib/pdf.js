// Generator PDF murni tanpa dependensi eksternal.
// Menghasilkan dokumen PDF 1.4 standar yang valid untuk laporan QA Test Execution.

export function cleanAscii(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/—/g, ' - ')
    .replace(/–/g, '-')
    .replace(/·/g, ' | ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapePdfText(str) {
  return cleanAscii(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export class SimplePdf {
  constructor(pageWidth = 595.28, pageHeight = 841.89) {
    // Ukuran A4 standar (point: 72 dpi)
    this.width = pageWidth;
    this.height = pageHeight;
    this.pages = [];
    this.currentPage = null;
    this.newPage();
  }

  newPage() {
    this.currentPage = {
      commands: [],
    };
    this.pages.push(this.currentPage);
    return this;
  }

  // Warna fill: r, g, b dalam rentang 0.0 - 1.0
  setFillColor(r, g, b) {
    this.currentPage.commands.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    return this;
  }

  setStrokeColor(r, g, b) {
    this.currentPage.commands.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    return this;
  }

  rect(x, y, w, h, fill = true, stroke = false) {
    const pdfY = this.height - y - h;
    const op = fill && stroke ? 'b' : fill ? 'f' : 's';
    this.currentPage.commands.push(`${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
    return this;
  }

  roundedRect(x, y, w, h, r = 4, fill = true, stroke = false) {
    r = Math.min(r, w / 2, h / 2);
    const k = r * 0.552284749831;
    const py = this.height - y - h;
    const x1 = x;
    const x2 = x + w;
    const y1 = py;
    const y2 = py + h;

    let cmd = `${(x1 + r).toFixed(2)} ${y1.toFixed(2)} m `;
    cmd += `${(x2 - r).toFixed(2)} ${y1.toFixed(2)} l `;
    cmd += `${(x2 - r + k).toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${(y1 + r - k).toFixed(2)} ${x2.toFixed(2)} ${(y1 + r).toFixed(2)} c `;
    cmd += `${x2.toFixed(2)} ${(y2 - r).toFixed(2)} l `;
    cmd += `${x2.toFixed(2)} ${(y2 - r + k).toFixed(2)} ${(x2 - r + k).toFixed(2)} ${y2.toFixed(2)} ${(x2 - r).toFixed(2)} ${y2.toFixed(2)} c `;
    cmd += `${(x1 + r).toFixed(2)} ${y2.toFixed(2)} l `;
    cmd += `${(x1 + r - k).toFixed(2)} ${y2.toFixed(2)} ${x1.toFixed(2)} ${(y2 - r + k).toFixed(2)} ${x1.toFixed(2)} ${(y2 - r).toFixed(2)} c `;
    cmd += `${x1.toFixed(2)} ${(y1 + r).toFixed(2)} l `;
    cmd += `${x1.toFixed(2)} ${(y1 + r - k).toFixed(2)} ${(x1 + r - k).toFixed(2)} ${y1.toFixed(2)} ${(x1 + r).toFixed(2)} ${y1.toFixed(2)} c `;

    const op = fill && stroke ? 'b' : fill ? 'f' : 's';
    cmd += `${op}`;
    this.currentPage.commands.push(cmd);
    return this;
  }

  line(x1, y1, x2, y2, lineWidth = 1) {
    const py1 = this.height - y1;
    const py2 = this.height - y2;
    this.currentPage.commands.push(`${lineWidth.toFixed(2)} w ${x1.toFixed(2)} ${py1.toFixed(2)} m ${x2.toFixed(2)} ${py2.toFixed(2)} l S`);
    return this;
  }

  text(str, x, y, options = {}) {
    const size = options.size || 10;
    const font = options.font || 'F1'; // F1 = Regular, F2 = Bold
    const pdfY = this.height - y - (options.baselineOffset || size * 0.8);
    const escaped = escapePdfText(str);

    let cmd = `BT /${font} ${size} Tf `;
    if (options.color) {
      const [r, g, b] = options.color;
      cmd += `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg `;
    }
    cmd += `${x.toFixed(2)} ${pdfY.toFixed(2)} Td (${escaped}) Tj ET`;
    this.currentPage.commands.push(cmd);
    return this;
  }

  textCenter(str, x, y, width, options = {}) {
    const size = options.size || 10;
    const font = options.font || 'F1';
    const charW = font === 'F2' ? size * 0.58 : size * 0.52;
    const estW = cleanAscii(str).length * charW;
    const offset = Math.max(0, (width - estW) / 2);
    return this.text(str, x + offset, y, options);
  }

  textRight(str, xRight, y, options = {}) {
    const size = options.size || 10;
    const font = options.font || 'F1';
    const charW = font === 'F2' ? size * 0.58 : size * 0.52;
    const estW = cleanAscii(str).length * charW;
    return this.text(str, Math.max(36, xRight - estW), y, options);
  }

  buildBuffer() {
    // Tambahkan running footer ke setiap halaman secara otomatis
    const totalPages = this.pages.length;
    for (let i = 0; i < totalPages; i++) {
      this.currentPage = this.pages[i];
      this.setStrokeColor(0.85, 0.88, 0.92).line(36, 804, 559, 804, 0.75);
      this.text('QA Agent Report  |  Confidential', 36, 816, { size: 7.5, font: 'F1', color: [0.5, 0.58, 0.65] });
      this.textRight(`Halaman ${i + 1} dari ${totalPages}`, 559, 816, { size: 7.5, font: 'F1', color: [0.5, 0.58, 0.65] });
    }

    const objects = [];
    const fontRegNum = 3;
    const fontBoldNum = 4;

    const pageObjNums = [];
    const contentObjNums = [];
    let nextObjNum = 5;

    for (let i = 0; i < this.pages.length; i++) {
      pageObjNums.push(nextObjNum++);
      contentObjNums.push(nextObjNum++);
    }

    const objStrings = [];
    objStrings[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
    const kidsStr = pageObjNums.map((n) => `${n} 0 R`).join(' ');
    objStrings[2] = `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjNums.length} >>\nendobj\n`;
    objStrings[3] = `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;
    objStrings[4] = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`;

    for (let i = 0; i < this.pages.length; i++) {
      const pNum = pageObjNums[i];
      const cNum = contentObjNums[i];
      const streamData = this.pages[i].commands.join('\n');
      const streamLen = Buffer.byteLength(streamData, 'utf8');

      objStrings[pNum] = `${pNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Contents ${cNum} 0 R /Resources << /Font << /F1 ${fontRegNum} 0 R /F2 ${fontBoldNum} 0 R >> >> >>\nendobj\n`;
      objStrings[cNum] = `${cNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamData}\nendstream\nendobj\n`;
    }

    let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];

    for (let i = 1; i < objStrings.length; i++) {
      offsets[i] = Buffer.byteLength(output, 'utf8');
      output += objStrings[i];
    }

    const startXref = Buffer.byteLength(output, 'utf8');
    output += `xref\n0 ${objStrings.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objStrings.length; i++) {
      output += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }

    output += `trailer\n<< /Size ${objStrings.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return Buffer.from(output, 'utf8');
  }
}
