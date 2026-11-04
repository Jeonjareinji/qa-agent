import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupDatabase() {
  const schemaPath = path.resolve(__dirname, '../schema.sql');
  console.log('🔄 Membaca schema dari:', schemaPath);

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ File schema.sql tidak ditemukan!');
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    console.log('⏳ Menghubungkan ke PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Terhubung! Menjalankan migration schema...');

    await client.query(sql);

    // Tambahkan user dev default jika belum ada
    const devUserId = Number(process.env.DEV_USER_ID || 1001);
    await client.query(
      `insert into users (id, username, full_name)
       values ($1, 'developer', 'Dev QA Agent')
       on conflict (id) do nothing`,
      [devUserId]
    );

    client.release();
    console.log('🎉 Database PostgreSQL berhasil disiapkan dengan skema schema.sql!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal menjalankan setup schema:', err.message);
    process.exit(1);
  }
}

setupDatabase();

