-- Migration: Add dummy modules for testing UI
-- Run this in Supabase SQL Editor

INSERT INTO modules (title, description, visibility, file_path, file_size, file_type)
VALUES 
  (
    'Pengenalan Laboratorium Kimia',
    'Modul pengenalan dasar-dasar laboratorium kimia, termasuk pengenalan alat-alat lab, keselamatan kerja, dan prosedur standar laboratorium.',
    'public',
    'modul-1-pengenalan-lab.pdf',
    2500000,
    'application/pdf'
  ),
  (
    'Titrasi Asam Basa',
    'Praktikum titrasi asam basa untuk menentukan konsentrasi larutan. Mencakup teori titrasi, indikator pH, dan perhitungan stoikiometri.',
    'public',
    'modul-2-titrasi-asam-basa.pdf',
    3200000,
    'application/pdf'
  ),
  (
    'Reaksi Redoks',
    'Modul praktikum reaksi oksidasi-reduksi, termasuk penentuan bilangan oksidasi, penyetaraan reaksi redoks, dan sel elektrokimia.',
    'public',
    'modul-3-reaksi-redoks.pdf',
    2800000,
    'application/pdf'
  ),
  (
    'Termokimia',
    'Praktikum penentuan kalor reaksi dan hukum Hess. Meliputi penggunaan kalorimeter, perhitungan entalpi, dan analisis data termokimia.',
    'public',
    'modul-4-termokimia.pdf',
    3500000,
    'application/pdf'
  ),
  (
    'Laju Reaksi dan Kesetimbangan',
    'Modul praktikum laju reaksi kimia dan faktor-faktor yang mempengaruhinya. Termasuk percobaan kesetimbangan dinamis.',
    'public',
    'modul-5-laju-reaksi.pdf',
    2900000,
    'application/pdf'
  ),
  (
    'Larutan dan Koloid',
    'Praktikum pembuatan dan sifat-sifat larutan serta sistem koloid. Mencakup sifat koligatif dan efek Tyndall.',
    'public',
    'modul-6-larutan-koloid.pdf',
    2600000,
    'application/pdf'
  ),
  (
    'Analisis Kualitatif',
    'Modul praktikum identifikasi ion-ion dalam larutan menggunakan metode analisis kualitatif klasik.',
    'public',
    'modul-7-analisis-kualitatif.pdf',
    3100000,
    'application/pdf'
  )
ON CONFLICT DO NOTHING;

INSERT INTO groups (name, description, cohort, visibility, storage_path, has_password)
VALUES 
  (
    'Kelompok A - Senin Pagi',
    'Kelompok praktikum shift Senin pagi (08.00 - 11.00 WIB)',
    '2024',
    'public',
    'kelompok-a-senin-pagi.pdf',
    false
  ),
  (
    'Kelompok B - Senin Siang',
    'Kelompok praktikum shift Senin siang (13.00 - 16.00 WIB)',
    '2024',
    'public',
    'kelompok-b-senin-siang.pdf',
    false
  ),
  (
    'Kelompok C - Selasa Pagi',
    'Kelompok praktikum shift Selasa pagi (08.00 - 11.00 WIB)',
    '2024',
    'public',
    'kelompok-c-selasa-pagi.pdf',
    false
  ),
  (
    'Kelompok D - Selasa Siang',
    'Kelompok praktikum shift Selasa siang (13.00 - 16.00 WIB)',
    '2024',
    'public',
    'kelompok-d-selasa-siang.pdf',
    false
  )
ON CONFLICT DO NOTHING;

-- Insert dummy announcements
INSERT INTO announcements (title, content, is_important, published_at, attachments)
VALUES 
  (
    'Jadwal Praktikum Semester Genap 2024/2025',
    'Praktikum Kimia Dasar semester genap akan dimulai pada tanggal 10 Februari 2025. Pastikan kalian sudah terdaftar di kelompok masing-masing dan membaca modul praktikum pertama sebelum datang ke lab.

Persiapan yang perlu dilakukan:
1. Membaca modul praktikum
2. Mengerjakan tugas pendahuluan
3. Membawa jas lab dan alat tulis
4. Datang tepat waktu

Keterlambatan lebih dari 15 menit tidak diperkenankan masuk lab.',
    true,
    NOW(),
    '[]'
  ),
  (
    'Peraturan Keselamatan Lab Terbaru',
    'Mulai semester ini, ada beberapa peraturan keselamatan baru yang harus dipatuhi:

1. Wajib menggunakan kacamata safety saat melakukan percobaan
2. Rambut panjang harus diikat
3. Dilarang membawa makanan dan minuman ke dalam lab
4. Wajib mencuci tangan sebelum dan sesudah praktikum
5. Melaporkan setiap kecelakaan/insiden kepada asisten

Pelanggaran akan dikenakan sanksi sesuai ketentuan.',
    true,
    NOW() - INTERVAL '2 days',
    '[]'
  ),
  (
    'Pengumuman: Libur Praktikum',
    'Praktikum tanggal 28 Maret 2025 ditiadakan karena bertepatan dengan Dies Natalis ITB. Praktikum akan diganti pada jadwal yang akan diumumkan kemudian.',
    false,
    NOW() - INTERVAL '5 days',
    '[]'
  )
ON CONFLICT DO NOTHING;
