// Gambar setiap halaman PDF ke <canvas> di dalam container (viewer di dalam Mini App).
export async function renderPdfPages(buf, container, isCancelled) {
  const mod = await import('pdfjs-dist');
  const pdfjs = mod.getDocument ? mod : mod.default;
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  container.replaceChildren();
  const w = Math.min(container.clientWidth, 900);
  const ratio = window.devicePixelRatio || 1;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (w * ratio) / base.width });
    const cv = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height;
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', `Halaman ${i} dari ${doc.numPages}`);
    if (isCancelled()) return;
    container.appendChild(cv);
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
  }
}
