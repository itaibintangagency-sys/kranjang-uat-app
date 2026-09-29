# Kranjang UAT App

Aplikasi ringan untuk menguji coba aplikasi Kranjang bersama tester non-teknis (KOL, Brand, Admin), dengan feedback per langkah dan dashboard hasil untuk Super Admin.

---

## 📁 Struktur File

```
kranjang-uat-app/
├── index.html              ← halaman masuk (input kode akses)
├── test.html                ← halaman step-by-step + feedback
├── summary.html              ← halaman ringkasan & rating akhir
├── admin/
│   └── dashboard.html        ← dashboard Super Admin
├── css/
│   └── style.css
├── js/
│   ├── supabase-client.js    ← ⚠️ HARUS DIEDIT sebelum deploy
│   ├── access.js
│   ├── test-flow.js
│   └── admin-dashboard.js
├── supabase_schema.sql        ← jalankan ini di Supabase SQL Editor
└── README.md                  ← file ini
```

---

## 🚀 Langkah Deploy — Urutan yang Benar

### STEP 1 — Setup Supabase

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → buat project baru (atau pakai yang sudah ada)
2. Buka **SQL Editor** → **New query**
3. Buka file `supabase_schema.sql` → copy semua isinya → paste di SQL Editor → klik **Run**
4. Pastikan hasil di bagian bawah menunjukkan:
   ```
   jumlah_step per role: kol=9, brand=10, admin=11
   jumlah_istilah: 20
   ```
5. Buka **Project Settings → API** → catat:
   - **Project URL**
   - **anon / public key**

### STEP 2 — Isi Kredensial Supabase ke Kode

1. Buka file `js/supabase-client.js`
2. Ganti dua baris ini dengan nilai dari Supabase kamu:
   ```js
   const SUPABASE_URL = "GANTI_DENGAN_SUPABASE_URL_KAMU";
   const SUPABASE_ANON_KEY = "GANTI_DENGAN_ANON_KEY_KAMU";
   ```
3. Simpan file

### STEP 3 — Buat Repository di GitHub

1. Buka [github.com](https://github.com) → klik **New repository**
2. Beri nama, misalnya `kranjang-uat-app` → pilih **Public** atau **Private** → **Create repository**
3. Di halaman repo kosong, klik **uploading an existing file**
4. **Drag seluruh folder** `kranjang-uat-app` (semua file & subfolder di dalamnya) ke area upload
   - GitHub akan otomatis mempertahankan struktur folder (`admin/`, `css/`, `js/`)
5. Klik **Commit changes**

### STEP 4 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → login dengan akun GitHub kamu
2. Klik **Add New → Project**
3. Pilih repository `kranjang-uat-app` yang baru dibuat → klik **Import**
4. Biarkan semua pengaturan default (tidak perlu framework preset, karena ini murni HTML statis)
5. Klik **Deploy**
6. Tunggu ±30 detik → kamu akan mendapat URL seperti `https://kranjang-uat-app.vercel.app`

### STEP 5 — Tambahkan Tester

1. Kembali ke Supabase → **Table Editor** → tabel `testers`
2. Klik **Insert row** → isi:
   - `access_code`: kode unik, misal `KOL-BUDI01`
   - `name`: nama tester (opsional, untuk personalisasi)
   - `role`: pilih salah satu — `kol`, `brand`, `admin`, atau `super_admin`
3. Ulangi untuk setiap tester yang akan diundang
4. Bagikan kode akses masing-masing lewat WhatsApp/link bersama URL Vercel kamu

> 4 tester contoh (`KOL-DEMO01`, `BRAND-DEMO01`, `ADMIN-DEMO01`, `SUPERADMIN-01`) sudah otomatis dibuat oleh `supabase_schema.sql` — bisa dipakai untuk uji coba pertama, lalu dihapus/diganti nanti.

---

## 🔄 Cara Update Konten di Kemudian Hari

Karena isi langkah-langkah testing disimpan di Supabase (tabel `test_steps`), kamu **tidak perlu ubah kode** untuk edit instruksi:

- Buka **Table Editor → test_steps** di Supabase
- Edit langsung kolom `title`, `instruction`, `warning_note`, atau `glossary_terms`
- Perubahan langsung tampil di aplikasi tanpa perlu deploy ulang

Untuk menambah istilah baru ke kamus, tambahkan baris baru di tabel `glossary`.

---

## ⚠️ Catatan Keamanan (Penting Dibaca)

Aplikasi ini didesain untuk **kebutuhan internal testing dengan jumlah tester terbatas**, bukan aplikasi publik skala besar. Beberapa penyederhanaan yang perlu diketahui:

- Kode akses divalidasi lewat function khusus (`validate_access_code`) sehingga tabel `testers` tidak terekspos langsung — cukup aman untuk kebutuhan ini
- Tabel `step_responses` dan `test_sessions` bisa dibaca oleh siapa saja yang tahu URL aplikasi (tanpa perlu kode akses) — ini pilihan sengaja untuk menyederhanakan alur tanpa sistem login penuh
- Jika ke depannya butuh keamanan lebih ketat (misalnya data sensitif atau tester dalam jumlah besar), pertimbangkan migrasi ke Supabase Auth dengan sesi login yang sesungguhnya

---

## 🎨 Kustomisasi

- **Warna & font**: edit `css/style.css` — variabel warna brand Kranjang sudah didefinisikan di bagian atas file (`:root`)
- **Tambah langkah baru**: insert baris baru ke tabel `test_steps` di Supabase, isi `role` dan `step_order` yang sesuai
- **Ubah teks sapaan/label**: edit langsung di file `.html` atau `.js` terkait
