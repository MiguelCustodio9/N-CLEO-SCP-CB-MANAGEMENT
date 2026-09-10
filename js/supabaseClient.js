// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// Vai a Supabase Studio → Project Settings → API e copia:
//   - Project URL
//   - anon public key
// Cola-os aqui. Isto é seguro de ficar público (é a chave "anon",
// protegida pelas políticas RLS definidas em sql/schema.sql).
// ============================================================
const SUPABASE_URL = "https://npajzelrqggeczzswflj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wYWp6ZWxycWdnZWN6enN3ZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTgzMzIsImV4cCI6MjEwNDYzNDMzMn0.QFS838miIo0a2cQpCGXfnM-8d-E1lfXWJ-_k3G-NZFQ";

const supabaseClienteCriado = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabaseClienteCriado;