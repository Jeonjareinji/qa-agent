# QA Agent — Telegram Mini App & Web QA Platform

Aplikasi manajemen pengujian Quality Assurance (QA) modern berbasis **Telegram Mini App (TMA)** dan **Web Dashboard**, dirancang khusus untuk mengelola siklus pengujian **Software** maupun **Hardware Testing**, mulai dari impor test case, eksekusi checklist, pelaporan bug, hingga ekspor laporan pengujian (PDF & Excel).

---

## 🚀 Fitur Utama

- **Dual Testing Domain**: Mendukung template dan skema pengujian khusus untuk **Software Testing** (Modul, Fitur, AC, Precondition, Steps, Expected) dan **Hardware Testing** (Komponen, Parameter, Unit, Pass Limit, Spec Source).
- **Import Test Case Cepat**: Unggah file spreadsheet Excel (`.xlsx`) langsung dari perangkat dengan validasi kolom otomatis.
- **Eksekusi Pengujian Interaktif**:
  - Pelacakan status test case real-time: `Pass`, `Fail`, `Blocked`, `N/A`, `Not Run`.
  - Input actual result dan integrasi langsung ke pencatatan bug saat terjadi failure.
  - Dukungan swipe gesture di perangkat mobile / Telegram.
- **Manajemen Bug Terintegrasi**:
  - Pencatatan bug lengkap dengan Severity (`Critical`, `Major`, `Minor`, `Trivial`), Prioritas (`P1 - Urgent` s/d `P4 - Low`), Tipe Bug, dan Status (`Open`, `In Progress`, `Resolved`, `Closed`).
  - Unggah lampiran foto/video bukti (*evidence*) pengujian.
- **Ekspor Laporan Profesional**:
  - **PDF Report**: Layout formal siap rilis dengan header institusional, ringkasan kartu metrik KPI terpusat, daftar bug tercatat, detail test case berindikator status warna, dan running page footer otomatis (`Halaman X dari Y`).
  - **Excel Report (`.xlsx`)**: Berkas spreadsheet lengkap dengan auto-width kolom dan pewarnaan status pengujian.
- **Integrasi Telegram Native**:
  - Haptic feedback pada aksi penting (sukses, gagal, konfirmasi).
  - Sinkronisasi identitas pengguna Telegram dan autentikasi aman via `initData`.
  - Mode fallback untuk pengujian lokal di browser biasa.

---

## 📂 Struktur Direktori Proyek

```text
qa-agent-backend_real/
├── backend/                  # Server API Node.js + Express
│   ├── db/                   # Skrip utilitas database (setup, flush, reset)
│   ├── lib/                  # Engine generator PDF kustom & generator Excel
│   │   ├── pdf.js            # Engine PDF mandiri berbasis PostScript/Type1
│   │   └── reportGenerator.js# Generator laporan PDF & Excel
│   ├── uploads/              # Direktori penyimpanan file upload (evidence)
│   ├── schema.sql            # Skema DDL tabel PostgreSQL
│   ├── server.js             # Entrypoint server Express & route API
│   ├── package.json          # Dependensi & skrip backend
│   └── .env.example          # Template konfigurasi environment backend
│
├── frontend/                 # Client Aplikasi React + Vite + TypeScript
│   ├── src/
│   │   ├── components/       # Komponen UI (Sheet, Button, Badge, Evidence, dll.)
│   │   ├── screens/          # Halaman aplikasi (Beranda, DetailKasus, CatatBug, ExportReport, dll.)
│   │   ├── lib/              # Klien API, helper telegram, utility hitung
│   │   ├── data/             # Definisi tipe TypeScript & dummy data
│   │   ├── App.tsx           # Router utama & state navigasi
│   │   └── main.tsx          # Entrypoint React
│   ├── package.json          # Dependensi & skrip frontend
│   └── vite.config.ts        # Konfigurasi Vite & proxy API backend
│
├── .env.example              # Template variabel lingkungan root
└── README.md                 # Dokumentasi proyek
```

---

## 🛠️ Prasyarat Sistem

Sebelum memulai instalasi, pastikan sistem komputer Anda sudah terpasang:

1. **Node.js**: Versi `18.x` atau lebih baru (`v20.x+` disarankan).
2. **PostgreSQL**: Versi `14.x` atau lebih baru yang sedang berjalan.
3. **NPM**: Bawaan dari Node.js (atau gunakan `pnpm` / `yarn`).

---

## ⚙️ Panduan Instalasi & Setup

### Langkah 1: Persiapan Database PostgreSQL

Buat sebuah database baru di PostgreSQL lokal Anda. Misalnya melalui `psql` atau pgAdmin:

```sql
CREATE DATABASE qa_agent;
```

---

### Langkah 2: Setup & Konfigurasi Backend

1. Buka terminal dan masuk ke folder `backend`:
   ```bash
   cd backend
   ```

2. Pasang semua dependensi backend:
   ```bash
   npm install
   ```

3. Buat file `.env` dari template:
   ```bash
   cp .env.example .env
   ```

4. Sesuaikan isi file `backend/.env` sesuai konfigurasi sistem Anda:
   ```env
   # Port Server Backend (default: 8787)
   PORT=8787

   # URL Koneksi PostgreSQL
   # Format: postgresql://<user>:<password>@<host>:<port>/<dbname>
   DATABASE_URL=postgresql://postgres:password_kamu@localhost:5432/qa_agent

   # Token Bot Telegram dari @BotFather (opsional saat testing lokal)
   BOT_TOKEN=

   # User ID default saat pengujian lokal di browser tanpa Telegram
   DEV_USER_ID=1001

   # Direktori upload file bukti
   UPLOAD_DIR=./uploads
   ```

5. Jalankan inisialisasi tabel database (migration):
   ```bash
   npm run db:setup
   ```
   *Perintah ini akan mengeksekusi `schema.sql` untuk membuat seluruh tabel, view, dan user bawaan di database PostgreSQL.*

6. Jalankan server backend:
   - **Mode Development (auto-reload saat file berubah):**
     ```bash
     npm run dev
     ```
   - **Mode Standar:**
     ```bash
     npm start
     ```
   Server backend akan aktif di: `http://localhost:8787`.

---

### Langkah 3: Setup & Menjalankan Frontend

1. Buka terminal baru dan masuk ke direktori `frontend`:
   ```bash
   cd frontend
   ```

2. Pasang semua dependensi frontend:
   ```bash
   npm install
   ```

3. Jalankan server development frontend:
   ```bash
   npm run dev
   ```

4. Buka tautan lokal yang tampil di terminal di browser Anda (umumnya `http://localhost:5173`).
   *Vite sudah dikonfigurasi untuk meneruskan setiap request `/api/*` secara otomatis ke backend di `http://127.0.0.1:8787`.*

---

## 🗄️ Perintah Manajemen Database

Backend menyediakan beberapa skrip pembantu untuk mengelola data:

| Perintah | Deskripsi |
|---|---|
| `npm run db:setup` | Membuat tabel awal dan skema baru dari `schema.sql`. |
| `npm run db:flush` | Mengosongkan data tabel transaksi (test cases, executions, bugs) dan mengembalikan akun dev default tanpa menghapus struktur tabel. |
| `npm run db:reset` | Menghapus seluruh tabel (`DROP TABLE`) lalu membuat ulang dari `schema.sql` (bersih total). |

> Jalankan perintah di atas dari dalam folder `backend/`.

---

## 📱 Pengujian di Telegram Mini App

Untuk menjalankan aplikasi ini langsung di dalam aplikasi Telegram:

1. **Jalankan Tunnel HTTPS** (Telegram Mini App mewajibkan koneksi HTTPS):
   Gunakan alat seperti Cloudflare Tunnel atau ngrok:
   ```bash
   # Contoh menggunakan cloudflared:
   cloudflared tunnel --url http://localhost:5173
   ```
2. **Atur Menu Button di Bot Telegram**:
   - Buka chat dengan [@BotFather](https://t.me/BotFather) di Telegram.
   - Pilih bot Anda > `/setmenubutton`.
   - Masukkan URL HTTPS hasil tunnel Anda (contoh: `https://xxx.trycloudflare.com`).
3. **Buka Bot Anda di Telegram**:
   Klik tombol menu aplikasi di pojok kiri bawah chat bot untuk meluncurkan QA Agent langsung di dalam Telegram.

---

## 📦 Build untuk Production

### Frontend
Untuk mengompilasi frontend menjadi berkas statis siap hosting:
```bash
cd frontend
npm run build
```
Hasil berkas produksi akan tersedia di direktori `frontend/dist/`.

### Backend
Pastikan variabel lingkungan `DATABASE_URL`, `BOT_TOKEN`, dan `PORT` pada server produksi sudah diset dengan benar, lalu jalankan:
```bash
cd backend
npm start
```

---

## 📄 Lisensi
Proyek ini dikembangkan secara internal untuk mendukung pengujian kualitas perangkat lunak dan perangkat keras. Seluruh hak cipta dilindungi.
