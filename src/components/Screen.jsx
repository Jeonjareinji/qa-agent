// Kerangka layar: header (dengan tombol kembali), isi, dan footer tombol.
export default function Screen({ title, onBack, footer, children }) {
  return (
    <div id="app">
      <header>
        {onBack && <button className="lk" onClick={onBack} aria-label="Kembali">‹ Kembali</button>}
        <h1>{title}</h1>
      </header>
      <main>{children}</main>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}
