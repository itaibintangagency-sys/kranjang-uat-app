-- ============================================================
-- Kranjang UAT App — Supabase Schema + Seed Data
-- Jalankan seluruh isi file ini sekaligus di SQL Editor Supabase
-- ============================================================

-- Bersihkan jika sudah pernah dijalankan sebelumnya
drop table if exists step_responses cascade;
drop table if exists test_sessions cascade;
drop table if exists test_steps cascade;
drop table if exists glossary cascade;
drop table if exists testers cascade;
drop function if exists validate_access_code(text);
drop function if exists get_dashboard_data(text);

-- ============ TABLES ============

create table testers (
  id uuid primary key default gen_random_uuid(),
  access_code text unique not null,
  name text,
  role text not null check (role in ('kol','brand','admin','super_admin')),
  created_at timestamptz default now()
);

create table test_steps (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('kol','brand','admin')),
  step_order int not null,
  title text not null,
  instruction text not null,
  warning_note text,
  glossary_terms text[] default '{}'
);

create table glossary (
  id uuid primary key default gen_random_uuid(),
  term text unique not null,
  definition text not null
);

create table test_sessions (
  id uuid primary key default gen_random_uuid(),
  tester_id uuid not null,
  overall_rating int,
  overall_comment text,
  completed_at timestamptz
);

create table step_responses (
  id uuid primary key default gen_random_uuid(),
  tester_id uuid not null,
  step_id uuid not null,
  feedback text not null check (feedback in ('easy','confusing','difficult')),
  comment text,
  submitted_at timestamptz default now()
);

-- ============ ROW LEVEL SECURITY ============

alter table testers enable row level security;
alter table test_steps enable row level security;
alter table glossary enable row level security;
alter table test_sessions enable row level security;
alter table step_responses enable row level security;

-- testers: TIDAK ada akses langsung dari luar (hanya lewat function validate_access_code)
-- test_steps & glossary: boleh dibaca publik (bukan data sensitif)
create policy "public read steps" on test_steps for select using (true);
create policy "public read glossary" on glossary for select using (true);

-- step_responses & test_sessions: anon boleh insert (submit feedback) dan select (lihat punya sendiri di sesi berjalan)
create policy "anon insert responses" on step_responses for insert with check (true);
create policy "anon select responses" on step_responses for select using (true);
create policy "anon insert sessions" on test_sessions for insert with check (true);
create policy "anon update sessions" on test_sessions for update using (true);
create policy "anon select sessions" on test_sessions for select using (true);

-- ============ FUNCTIONS ============

-- Validasi kode akses tanpa membuka tabel testers ke publik
create or replace function validate_access_code(input_code text)
returns table(id uuid, name text, role text) as $$
  select id, name, role from testers where access_code = input_code;
$$ language sql security definer;

grant execute on function validate_access_code(text) to anon;

-- Dashboard Super Admin: hanya bisa dipanggil dengan kode akses super_admin yang valid
create or replace function get_dashboard_data(input_code text)
returns table(
  step_id uuid, step_title text, step_role text,
  feedback text, comment text, tester_name text, submitted_at timestamptz
) as $$
  select sr.step_id, ts.title, ts.role, sr.feedback, sr.comment, t.name, sr.submitted_at
  from step_responses sr
  join test_steps ts on ts.id = sr.step_id
  join testers t on t.id = sr.tester_id
  where exists (select 1 from testers sa where sa.access_code = input_code and sa.role = 'super_admin')
  order by sr.submitted_at desc;
$$ language sql security definer;

grant execute on function get_dashboard_data(text) to anon;

-- ============ SEED: GLOSSARY ============
insert into glossary (term, definition) values
  ('KOL', 'Singkatan dari Key Opinion Leader — istilah untuk influencer/content creator yang bekerja sama dengan brand.'),
  ('Brand', 'Perusahaan atau pemilik produk yang ingin dipromosikan lewat KOL.'),
  ('Tier', 'Tingkatan KOL berdasarkan jumlah pengikut (follower) — ada Nano, Micro, dan Macro.'),
  ('SOW', 'Singkatan Scope of Work — daftar tugas dan ketentuan yang harus dipenuhi dalam sebuah campaign.'),
  ('GMV', 'Singkatan Gross Merchandise Value — total nilai penjualan yang dihasilkan dari konten atau link seorang KOL.'),
  ('Affiliate Link', 'Link khusus produk — jika orang belanja lewat link ini, KOL mendapat komisi.'),
  ('TikTok Shop Partner Center', 'Halaman khusus di TikTok untuk mengatur kerja sama penjualan dan afiliasi produk.'),
  ('Engagement Type', 'Jenis kerja sama dalam campaign, misalnya Affiliate (jual produk), Influencer (bikin konten), atau Endorsement.'),
  ('Coin', 'Saldo poin di dalam aplikasi Kranjang yang bisa dipakai brand untuk membayar campaign berikutnya.'),
  ('Refund', 'Pengembalian sebagian dana ke brand jika biaya aktual lebih kecil dari yang sudah dibayar.'),
  ('Live Session', 'Sesi siaran langsung (live streaming) yang dilakukan KOL sesuai jadwal campaign.'),
  ('Draft', 'Status awal sebuah campaign — baru dibuat tapi belum bisa didaftar oleh KOL.'),
  ('Open Campaign', 'Status campaign yang sudah bisa dilihat dan didaftar oleh KOL.'),
  ('Content Submission', 'Proses KOL mengirimkan hasil karyanya (video/foto) untuk ditinjau brand atau admin.'),
  ('Platform Fee', 'Biaya jasa yang dikenakan Kranjang ke brand untuk setiap campaign yang dijalankan.'),
  ('PPN', 'Pajak Pertambahan Nilai — pajak resmi yang ditambahkan ke total biaya campaign.'),
  ('Backoffice', 'Halaman khusus admin untuk mengatur semua data dan campaign di sistem Kranjang.'),
  ('Status Konten', 'Tahapan status sebuah konten, misalnya sedang ditinjau, disetujui, ditolak, atau sudah diunggah.'),
  ('Upload Link Period', 'Batas waktu KOL harus mengirimkan link video TikTok yang sudah dipublikasikan.'),
  ('Rate', 'Harga atau biaya yang disepakati untuk satu video atau satu sesi live.');

-- ============ SEED: TEST STEPS ============
insert into test_steps (role, step_order, title, instruction, warning_note, glossary_terms) values
  ('kol', 1, 'Daftar Akun KOL', '• Buka aplikasi Kranjang, lalu ketuk "Buat Akun Baru".\n• Pilih tipe akun "KOL".\n• Masukkan alamat email dan username TikTok kamu — pastikan sama persis dengan akun TikTok asli.\n• Masukkan kode verifikasi yang dikirim ke email.\n• Buat nama akun (username) dan masukkan kode referral jika ada.\n• Buat password, lalu ketuk "Submit".', 'Username TikTok yang salah ketik akan membuat sistem gagal melacak komisi dan penghasilanmu.', ARRAY['KOL']::text[]),
  ('kol', 2, 'Lengkapi Profil KOL', '• Buka menu Profil.\n• Di tab General: isi nomor HP, provinsi, dan wilayah kamu.\n• Di tab Rate & Payment: isi biaya per video dan per live session yang kamu tawarkan, serta info rekening bank.\n• Di tab Social Media Account: masukkan username TikTok yang sama persis dan jumlah follower kamu saat ini.', 'Semua tab wajib diisi lengkap sebelum kamu bisa ikut campaign apapun.', ARRAY['Rate', 'Tier', 'GMV']::text[]),
  ('kol', 3, 'Lihat & Daftar Campaign', '• Buka menu Campaigns.\n• Kamu akan melihat daftar campaign yang cocok dengan profil kamu.\n• Buka salah satu campaign, baca detailnya — apa yang harus dibuat, berapa lama, dan produk apa.\n• Ketuk "Daftar" jika kamu tertarik.\n• Jika campaign membutuhkan sesi live, pilih jadwal yang masih tersedia.', null, ARRAY['SOW', 'Tier', 'Live Session']::text[]),
  ('kol', 4, 'Tunggu Persetujuan Brand', '• Setelah mendaftar, brand akan meninjau profil kamu terlebih dahulu.\n• Kamu akan mendapat notifikasi apakah diterima atau ditolak.\n• Jika diterima, kamu bisa langsung mulai membuat konten.', 'Pastikan notifikasi aplikasi aktif agar kamu tidak ketinggalan info penting.', '{}'::text[]),
  ('kol', 5, 'Upload Draft Konten', '• Buka campaign yang sedang berjalan.\n• Ketuk tombol tambah konten.\n• Unggah video atau gambar draft kamu sebelum batas waktu yang ditentukan.', 'Jika telat upload draft, campaign kamu bisa dianggap gagal dan tidak dibayar.', ARRAY['Content Submission', 'Status Konten']::text[]),
  ('kol', 6, 'Perbaiki & Upload Link TikTok', '• Tunggu hasil review dari brand: Diterima atau Ditolak.\n• Jika ditolak, baca catatannya, perbaiki kontenmu, lalu upload ulang.\n• Jika diterima, posting video tersebut ke akun TikTok kamu.\n• Salin link video itu, lalu tempelkan di aplikasi Kranjang.', 'Kamu hanya boleh direvisi 1 kali. Kirim link sebelum batas waktu yang ditentukan.', ARRAY['Upload Link Period', 'Status Konten']::text[]),
  ('kol', 7, 'Upload Bukti Live Session', '• Jika campaign mengharuskan live, lakukan live sesuai jadwal yang sudah kamu pilih.\n• Ambil foto atau screenshot sebagai bukti kamu sudah live.\n• Upload bukti tersebut di halaman campaign.', null, ARRAY['Live Session']::text[]),
  ('kol', 8, 'Gunakan Link Affiliate Produk', '• Buka menu Produk.\n• Pilih produk yang ingin kamu promosikan.\n• Salin link affiliate produk tersebut.\n• Gunakan link itu di akun TikTok kamu untuk mendapat komisi tambahan.', null, ARRAY['Affiliate Link']::text[]),
  ('kol', 9, 'Cek Status Pembayaran', '• Buka menu riwayat pembayaran.\n• Lihat status: Menunggu, Sudah Dibayar, atau Belum Dibayar.\n• Jika sudah dibayar, kamu bisa melihat bukti transfernya langsung di aplikasi.', null, ARRAY['Rate']::text[]),
  ('brand', 1, 'Daftar Akun Brand', '• Buka aplikasi, ketuk "Buat Akun Baru".\n• Pilih tipe akun "Brand".\n• Masukkan email, lalu verifikasi dengan kode OTP.\n• Masukkan nama brand dan nama contact person.\n• Buat password, lalu ketuk "Submit".', null, ARRAY['Brand']::text[]),
  ('brand', 2, 'Lengkapi Profil Brand', '• Buka menu Profil.\n• Isi kategori brand, foto profil, dan nomor kontak.\n• Masukkan username TikTok brand yang sama persis dengan akun asli.', 'Username yang salah membuat data penjualan brand tidak akurat.', ARRAY['GMV']::text[]),
  ('brand', 3, 'Sambungkan TikTok & Daftarkan Produk', '• Di halaman profil, ketuk "Sambungkan TikTok".\n• Hubungi admin Bintang untuk mendapatkan link bergabung program afiliasi produk.\n• Pilih produk-produk yang ingin kamu daftarkan.\n• Tunggu admin menyetujui produk kamu.', null, ARRAY['TikTok Shop Partner Center', 'Affiliate Link']::text[]),
  ('brand', 4, 'Minta Dibuatkan Campaign', '• Hubungi admin dengan info: tingkatan KOL yang diinginkan, jumlah KOL, kisaran harga, kategori campaign, dan produk yang mau dipromosikan.\n• Admin akan membuatkan campaign untuk kamu — statusnya masih "Draft" dan belum terlihat oleh KOL.', null, ARRAY['Tier', 'SOW', 'Draft']::text[]),
  ('brand', 5, 'Bayar Campaign', '• Buka detail campaign kamu.\n• Pilih cara bayar: Transfer Bank (lalu upload bukti) atau menggunakan Coin.\n• Setelah dibayar, tunggu admin memverifikasi pembayaran.', 'Jangan minta ubah kebutuhan campaign (SOW) setelah bayar — ini akan mengunci campaign kamu.', ARRAY['Coin', 'Platform Fee', 'PPN']::text[]),
  ('brand', 6, 'Terima atau Tolak KOL yang Mendaftar', '• Buka campaign, lihat daftar KOL yang mendaftar.\n• Cek profil mereka — jumlah follower dan riwayat penjualan sebelumnya.\n• Ketuk Terima atau Tolak untuk setiap KOL.', null, ARRAY['Tier', 'GMV']::text[]),
  ('brand', 7, 'Cek & Setujui Konten KOL', '• Buka konten yang dikirimkan oleh KOL.\n• Lihat videonya, lalu ketuk Setuju atau Tolak (sertakan alasan jika ditolak).', 'Konten hanya bisa ditolak 1 kali. Review dalam 24 jam, atau nanti otomatis disetujui sistem.', ARRAY['Status Konten']::text[]),
  ('brand', 8, 'Beri Nilai pada Konten', '• Setelah KOL mengirim link TikTok, buka link tersebut.\n• Beri bintang penilaian sesuai kualitas kontennya.', null, '{}'::text[]),
  ('brand', 9, 'Terima Pengembalian Dana (Refund)', '• Setelah campaign selesai, cek apakah ada sisa dana yang bisa dikembalikan.\n• Pilih mau diterima dalam bentuk transfer tunai atau Coin.', null, ARRAY['Refund', 'Coin']::text[]),
  ('brand', 10, 'Cek Riwayat Campaign', '• Buka riwayat campaign kamu.\n• Lihat total yang sudah dibayar, biaya aktual, dan jumlah pengembalian dana.', null, '{}'::text[]),
  ('admin', 1, 'Setel Link Affiliate Produk Brand', '• Buka TikTok Shop Partner Center, setujui produk brand di kampanye khusus yang sudah disiapkan.\n• Buka Backoffice Kranjang, masuk ke menu Brand Product.\n• Set persentase komisi untuk KOL pada produk tersebut, lalu simpan.', null, ARRAY['Affiliate Link', 'TikTok Shop Partner Center', 'Backoffice']::text[]),
  ('admin', 2, 'Buat Campaign Baru', '• Buka menu Campaign di Backoffice.\n• Klik tombol tambah data baru.\n• Isi nama campaign, jenis kerja sama, dan semua periode penting (registrasi, draft, upload, pembayaran).\n• Simpan data.', null, ARRAY['Engagement Type', 'Backoffice']::text[]),
  ('admin', 3, 'Isi Kebutuhan Campaign (SOW)', '• Buka tab SOW pada campaign.\n• Isi deskripsi konten yang diminta brand.\n• Tentukan tingkatan KOL, jumlah KOL, kisaran harga, dan jumlah konten yang dibutuhkan.\n• Simpan — sistem akan menghitung otomatis perkiraan biaya campaign.', 'Jangan menaikkan kebutuhan ini setelah brand sudah membayar — campaign bisa terkunci.', ARRAY['SOW', 'Tier', 'Platform Fee', 'PPN']::text[]),
  ('admin', 4, 'Atur Filter, Brand & Produk', '• Tab Filter (opsional): batasi usia atau wilayah KOL yang boleh ikut.\n• Tab Brand (wajib): pilih brand mana yang memakai campaign ini.\n• Tab Produk: pilih produk-produk yang akan dipromosikan.', null, '{}'::text[]),
  ('admin', 5, 'Buka Campaign untuk KOL', '• Tunggu status pembayaran brand berubah menjadi "Sudah Bayar".\n• Klik tombol "Buka Campaign".', null, ARRAY['Draft', 'Open Campaign']::text[]),
  ('admin', 6, 'Setujui Konten (Jika Diminta)', '• Buka menu Content Submission.\n• Cari konten berdasarkan nama KOL atau nama campaign.\n• Setujui atau tolak konten tersebut.', null, ARRAY['Content Submission', 'Status Konten']::text[]),
  ('admin', 7, 'Proses Pengembalian Dana ke Brand', '• Buka menu Content Payment.\n• Cari campaign yang sudah selesai.\n• Sistem menghitung otomatis sisa dana — upload bukti transfer, atau kreditkan sebagai Coin ke akun brand.', null, ARRAY['Refund', 'Coin']::text[]),
  ('admin', 8, 'Bayar KOL', '• Buka tab Campaign KOLs di halaman detail campaign.\n• Klik nama KOL yang ingin dibayar.\n• Lakukan transfer manual, lalu upload bukti pembayarannya.', null, ARRAY['Rate']::text[]),
  ('admin', 9, 'Atur Tingkatan KOL (Tier)', '• Buka menu KOL Level.\n• Ubah batas jumlah follower untuk tiap tingkatan — Nano, Micro, atau Macro.', 'Perubahan ini berdampak ke SEMUA KOL yang terdaftar — lakukan dengan hati-hati.', ARRAY['Tier']::text[]),
  ('admin', 10, 'Buat Pengumuman', '• Buka menu Announcement.\n• Tulis isi pengumuman, lalu tentukan penerimanya — Brand, KOL, atau keduanya.', null, '{}'::text[]),
  ('admin', 11, 'Ambil Data dari TikTok', '• Setelah periode upload konten selesai, buka menu Import TikTok Data.\n• Import data penjualan dan tayangan dari TikTok untuk setiap KOL.', null, ARRAY['GMV']::text[]);

-- ============ SEED: CONTOH TESTER (opsional, hapus/ubah sesuai kebutuhan) ============
insert into testers (access_code, name, role) values
  ('KOL-DEMO01', 'Tester KOL Contoh', 'kol'),
  ('BRAND-DEMO01', 'Tester Brand Contoh', 'brand'),
  ('ADMIN-DEMO01', 'Tester Admin Contoh', 'admin'),
  ('SUPERADMIN-01', 'Super Admin', 'super_admin');

-- ============ VERIFIKASI ============
select role, count(*) as jumlah_step from test_steps group by role order by role;
select count(*) as jumlah_istilah from glossary;