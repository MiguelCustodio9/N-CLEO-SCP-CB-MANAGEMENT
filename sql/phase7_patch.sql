-- ============================================================
-- PATCH FASE 7 — cronómetro de jogo ao vivo + estatísticas coletivas
-- Corre isto no SQL Editor do Supabase Studio.
-- ============================================================

create table if not exists jogo_configuracao (
    jogo_id uuid primary key references jogos(id) on delete cascade,
    numero_partes int not null default 2,
    minutos_por_parte int not null default 20,
    parte_atual int not null default 0,
    estado text not null default 'parado' check (estado in ('parado','a_decorrer','pausado','intervalo','terminado')),
    segundos_acumulados int not null default 0,
    iniciado_em timestamptz,
    updated_at timestamptz default now()
);

create table if not exists jogo_estatisticas_coletivas (
    jogo_id uuid primary key references jogos(id) on delete cascade,
    remates_nos int not null default 0,
    remates_adversario int not null default 0,
    remates_baliza_nos int not null default 0,
    remates_baliza_adversario int not null default 0,
    dribles_tentados_nos int not null default 0,
    dribles_tentados_adversario int not null default 0,
    dribles_conseguidos_nos int not null default 0,
    dribles_conseguidos_adversario int not null default 0,
    defesas_nos int not null default 0,
    defesas_adversario int not null default 0,
    cantos_nos int not null default 0,
    cantos_adversario int not null default 0,
    passes_nos int not null default 0,
    passes_adversario int not null default 0,
    passes_certos_nos int not null default 0,
    passes_certos_adversario int not null default 0,
    faltas_nos int not null default 0,
    faltas_adversario int not null default 0,
    posse_nos_segundos int not null default 0,
    posse_adversario_segundos int not null default 0,
    posse_atual text check (posse_atual in ('nos','adversario')),
    posse_desde timestamptz,
    updated_at timestamptz default now()
);

alter table jogo_configuracao enable row level security;
alter table jogo_estatisticas_coletivas enable row level security;

drop policy if exists config_select on jogo_configuracao;
drop policy if exists config_treinador on jogo_configuracao;
create policy config_select on jogo_configuracao for select using (true);
create policy config_treinador on jogo_configuracao for all using (is_treinador()) with check (is_treinador());

drop policy if exists coletivas_select on jogo_estatisticas_coletivas;
drop policy if exists coletivas_treinador on jogo_estatisticas_coletivas;
create policy coletivas_select on jogo_estatisticas_coletivas for select using (true);
create policy coletivas_treinador on jogo_estatisticas_coletivas for all using (is_treinador()) with check (is_treinador());

alter publication supabase_realtime add table jogo_configuracao;
alter publication supabase_realtime add table jogo_estatisticas_coletivas;
