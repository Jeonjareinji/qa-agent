import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isReset = process.argv.includes('--reset');

async function flushDatabase() {
  const client = await pool.connect();
  try {
    if (isReset) {
      console.log('⏳ Menghapus semua tabel & view lama lalu membuat ulang dari schema.sql...');
      await client.query('begin');
      await client.query(`
        drop view if exists v_execution_progress cascade;
        drop table if exists
          bugs,
          execution_results_software,
          execution_results_hardware,
          test_execution_sets,
          test_executions,
          test_cases_software,
          test_cases_hardware,
          test_case_sets,
          users
        cascade;
      `);
      const schemaPath = path.resolve(__dirname, '../schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(sql);

      const devUserId = Number(process.env.DEV_USER_ID || 1001);
      await client.query(
        `insert into users (id, username, full_name)
         values ($1, 'developer', 'Dev QA Agent')
         on conflict (id) do nothing`,
        [devUserId]
      );
      await client.query('commit');
    } else {
      console.log('⏳ Mengosongkan semua data (TRUNCATE RESTART IDENTITY CASCADE)...');
      await client.query(`
        truncate table
          bugs,
          execution_results_software,
          execution_results_hardware,
          test_execution_sets,
          test_executions,
          test_cases_software,
          test_cases_hardware,
          test_case_sets
        restart identity cascade;
      `);
      const devUserId = Number(process.env.DEV_USER_ID || 1001);
      await client.query(
        `insert into users (id, username, full_name)
         values ($1, 'developer', 'Dev QA Agent')
         on conflict (id) do nothing`,
        [devUserId]
      );
    }

    console.log('🎉 Database berhasil dibersihkan (ID di-reset kembali ke 1)!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal membersihkan database:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

flushDatabase();

