# QA Agent Backend (Express + PostgreSQL)

Backend API untuk aplikasi QA Agent, terhubung dengan database PostgreSQL sesuai spesifikasi `schema.sql`.

## Persyaratan
- Node.js (v18+)
- PostgreSQL (v14+)

## Setup & Instalasi

1. **Masuk ke folder backend:**
   ```bash
   cd backend
   ```

2. **Atur Environment Variable (`.env`):**
   Salin `.env.example` ke `.env` (atau gunakan `.env` yang sudah ada di root):
   ```bash
   cp .env.example .env
   ```
   Pastikan nilai `DATABASE_URL` sudah sesuai dengan database PostgreSQL Anda, misalnya:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/qa_agent
   PORT=8787
   ```

3. **Inisialisasi Database (Migration):**
   Jalankan perintah ini untuk membuat semua tabel, relasi, view, dan user default dari `schema.sql`:
   ```bash
   npm run db:setup
   ```

4. **Jalankan Server Backend:**
   - **Mode Development (auto-reload):**
     ```bash
     npm run dev
     ```
   - **Mode Production:**
     ```bash
     npm start
     ```

Server akan aktif di `http://localhost:8787`.

---

## Endpoint API Utama

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/health` / `/api/health` | Status server backend |
| `GET` | `/api/dashboard` | Ringkasan metrics, pass rate, & status test case |
| `GET` | `/api/users` | Daftar user/anggota tim |
| `GET` | `/api/sets` | Daftar kumpulan test case |
| `POST` | `/api/sets` | Simpan kumpulan test case baru |
| `GET` | `/api/sets/:id` | Detail kumpulan & test case di dalamnya |
| `DELETE` | `/api/sets/:id` | Hapus kumpulan test case |
| `GET` | `/api/executions` | Daftar test execution & progres |
| `POST` | `/api/executions` | Buat test execution baru |
| `GET` | `/api/executions/:id` | Detail hasil eksekusi pengujian |
| `PATCH` | `/api/executions/:id/results/:rid` | Update status (Pass/Fail/dll), catatan, bug |
| `DELETE` | `/api/executions/:id` | Hapus test execution |
| `POST` | `/api/executions/:id/report` | Upload & selesaikan report PDF |
| `GET` | `/api/executions/:id/report` | Unduh report PDF |

