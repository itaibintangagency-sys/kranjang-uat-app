// ===== Kranjang UAT App — Supabase Client =====
// GANTI dua nilai di bawah ini dengan milikmu sendiri
// (Supabase Dashboard → Project Settings → API)

const SUPABASE_URL = "GANTI_DENGAN_SUPABASE_URL_KAMU";
const SUPABASE_ANON_KEY = "GANTI_DENGAN_ANON_KEY_KAMU";

// Nama variabel sengaja "db", bukan "supabase" —
// karena CDN library sudah memakai nama global "supabase" (window.supabase).
// Memakai nama yang sama akan menyebabkan error "already declared".
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
