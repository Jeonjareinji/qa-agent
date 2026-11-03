# QA Agent Mini App (React + Vite)

Satu file per flow di `src/flows/`:

| File | Flow |
|---|---|
| `Home.jsx` | Menu utama |
| `ImportTestCase.jsx` | 1. Import test case dari Excel |
| `CreateExecution.jsx` | 2. Buat test execution |
| `ExecutionList.jsx` | 3a. Daftar test execution + Play |
| `RunExecution.jsx` | 3b. Menjalankan test case, update status |
| `FinishExecution.jsx` | 3c. Ringkasan dan buat report PDF |
| `PdfViewer.jsx` | Tampilan report PDF di dalam Mini App |

Pendukung: `src/store.jsx` (data + localStorage), `src/lib/` (excel, report PDF, viewer PDF), `src/components/` (Screen, Toast), `src/styles.css`.

Kunci localStorage sama dengan versi HTML (`qa-agent-v1`), jadi data lama di domain yang sama tetap terbaca.

## Jalankan
```
npm install
npm run dev        # development
npm run build      # hasil di folder dist/
```

## Deploy
Mini App harus memakai hasil build (folder `dist/`), bukan file di `src/`.

- **GitHub Pages:** commit seluruh project ke repo (termasuk `.github/workflows/deploy.yml`), lalu di Settings > Pages ubah Source ke **GitHub Actions**. Setiap push ke `main` otomatis build dan deploy.
- **Cloudflare Pages:** Connect to Git, Build command `npm run build`, Build output directory `dist`.
- **Manual:** jalankan `npm run build`, lalu upload isi `dist/` (bukan foldernya) ke hosting statis.

Setelah deploy, tambahkan `?v=2` di URL Menu Button BotFather supaya Telegram memuat versi baru.
