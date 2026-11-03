export const SAMPLE_CASES = [
  { id: 'TC-001', sc: 'Login dengan kredensial valid', st: '1. Buka halaman login\n2. Isi email dan password valid\n3. Tekan Masuk', ex: 'Pengguna masuk ke beranda' },
  { id: 'TC-002', sc: 'Login dengan password salah', st: '1. Buka halaman login\n2. Isi password salah\n3. Tekan Masuk', ex: 'Muncul pesan “Email atau password salah”' },
  { id: 'TC-003', sc: 'Registrasi dengan email terdaftar', st: '1. Buka halaman registrasi\n2. Isi email yang sudah terdaftar\n3. Tekan Daftar', ex: 'Muncul pesan email sudah digunakan' },
  { id: 'TC-004', sc: 'Reset password lewat email', st: '1. Tekan Lupa password\n2. Isi email\n3. Buka tautan di email', ex: 'Password baru berhasil disimpan' },
];
