-- ============================================================
-- PATCH FASE 6 — convocatória, titulares, suplentes e substituições
-- Corre isto no SQL Editor do Supabase Studio.
-- ============================================================

create table if not exists jogo_participantes (
    id uuid primary key default gen_random_uuid(),
    jogo_id uuid not null references jogos(id) on delete cascade,
    atleta_id uuid not null references atletas(id) on delete cascade,
    tipo text not null check (tipo in ('convocado','titular','suplente','suplente_utilizado')),
    posicao_tatica text,
    unique(jogo_id, atleta_id)
);

create table if not exists jogo_substituicoes (
    id uuid primary key default gen_random_uuid(),
    jogo_id uuid not null references jogos(id) on delete cascade,
    atleta_sai_id uuid references atletas(id) on delete set null,
    atleta_entra_id uuid references atletas(id) on delete set null,
    minuto int,
    created_at timestamptz default now()
);

alter table jogo_participantes enable row level security;
alter table jogo_substituicoes enable row level security;

drop policy if exists participantes_select on jogo_participantes;
drop policy if exists participantes_treinador on jogo_participantes;
create policy participantes_select on jogo_participantes for select using (true);
create policy participantes_treinador on jogo_participantes for all using (is_treinador()) with check (is_treinador());

drop policy if exists substituicoes_select on jogo_substituicoes;
drop policy if exists substituicoes_treinador on jogo_substituicoes;
create policy substituicoes_select on jogo_substituicoes for select using (true);
create policy substituicoes_treinador on jogo_substituicoes for all using (is_treinador()) with check (is_treinador());

-- realtime também para a convocatória (atualiza ao vivo tal como as estatísticas)
alter publication supabase_realtime add table jogo_participantes;
alter publication supabase_realtime add table jogo_substituicoes;
