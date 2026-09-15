// Edge Function: criar-utilizador
// Cria a conta de login (auth.users + perfis) de uma jogadora.
// Só pode ser chamada por um treinador autenticado.
//
// DEPLOY (uma vez, via Supabase CLI):
//   supabase functions deploy criar-utilizador
//
// A função usa a SERVICE_ROLE_KEY, que o Supabase já expõe automaticamente
// dentro das Edge Functions como variável de ambiente — nunca precisas de a
// colocar no site estático nem no código do GitHub Pages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    // cliente "do chamador", para confirmar que quem pede é mesmo o treinador
    const supabaseCaller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseCaller.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: corsHeaders });
    }

    const { data: perfilChamador } = await supabaseCaller
      .from("perfis").select("tipo_utilizador").eq("id", user.id).single();

    if (!perfilChamador || perfilChamador.tipo_utilizador !== "treinador") {
      return new Response(JSON.stringify({ error: "Só o treinador pode criar contas." }), { status: 403, headers: corsHeaders });
    }

    const { username, password, atleta_id, tipo } = await req.json();
    const tipoFinal = tipo || (atleta_id ? "jogador" : null);

    if (!username || !password || !tipoFinal) {
      return new Response(JSON.stringify({ error: "Dados em falta." }), { status: 400, headers: corsHeaders });
    }
    if (tipoFinal === "jogador" && !atleta_id) {
      return new Response(JSON.stringify({ error: "Falta indicar a atleta." }), { status: 400, headers: corsHeaders });
    }
    if (!["jogador", "treinador"].includes(tipoFinal)) {
      return new Response(JSON.stringify({ error: "Tipo de utilizador inválido." }), { status: 400, headers: corsHeaders });
    }

    // cliente admin (service role) — só existe aqui dentro, nunca no browser
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const emailTecnico = username.trim().toLowerCase().replace(/\s+/g, ".") + "@nucleoscp.app";

    const { data: novo, error: erroCriar } = await supabaseAdmin.auth.admin.createUser({
      email: emailTecnico,
      password,
      email_confirm: true,
    });
    if (erroCriar) return new Response(JSON.stringify({ error: erroCriar.message }), { status: 400, headers: corsHeaders });

    const { error: erroPerfil } = await supabaseAdmin.from("perfis").insert({
      id: novo.user.id,
      tipo_utilizador: tipoFinal,
      nome_utilizador: username.trim(),
    });
    if (erroPerfil) return new Response(JSON.stringify({ error: erroPerfil.message }), { status: 400, headers: corsHeaders });

    if (tipoFinal === "jogador") {
      const { error: erroLigar } = await supabaseAdmin.from("atletas")
        .update({ user_id: novo.user.id }).eq("id", atleta_id);
      if (erroLigar) return new Response(JSON.stringify({ error: erroLigar.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, user_id: novo.user.id }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
