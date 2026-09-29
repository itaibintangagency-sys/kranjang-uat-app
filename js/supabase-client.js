// ===== Kranjang UAT App — Supabase Client =====
// GANTI dua nilai di bawah ini dengan milikmu sendiri
// (Supabase Dashboard → Project Settings → API)

const SUPABASE_URL = "https://yupwwavuckllafjtcegc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cHd3YXZ1Y2tsbGFmanRjZWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDYzODksImV4cCI6MjEwNjIyMjM4OX0.8mFPdyKK6Lrm_qFR97eYIA2vdJw3exYlUzXs6IGGjTM";

// Nama variabel sengaja "db", bukan "supabase" —
// karena CDN library sudah memakai nama global "supabase" (window.supabase).
// Memakai nama yang sama akan menyebabkan error "already declared".
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
