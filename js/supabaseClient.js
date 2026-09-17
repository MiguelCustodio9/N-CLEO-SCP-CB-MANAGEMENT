// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// Vai a Supabase Studio → Project Settings → API e copia:
//   - Project URL
//   - anon public key
// Cola-os aqui. Isto é seguro de ficar público (é a chave "anon",
// protegida pelas políticas RLS definidas em sql/schema.sql).
// ============================================================
const SUPABASE_URL = "COLA_AQUI_O_TEU_PROJECT_URL";
const SUPABASE_ANON_KEY = "COLA_AQUI_A_TUA_ANON_KEY";

const supabaseClienteCriado = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// substitui a "biblioteca" global pelo cliente já configurado, para o resto
// do código (auth.js, plantel.js, etc.) poder continuar a usar "supabase.from(...)" normalmente
window.supabase = supabaseClienteCriado;
