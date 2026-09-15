-- ============================================================
-- PATCH COMPLETO — junta as Fases 5, 6, 7 e 8 num único ficheiro
-- Podes correr isto de uma vez no SQL Editor do Supabase Studio.
-- É seguro correr mesmo que já tenhas corrido alguns destes patches
-- antes (tudo aqui é "IF NOT EXISTS" / "DROP ... IF EXISTS" ou apanha
-- o erro de duplicado nas publicações de Realtime).
-- ============================================================



-- ============== phase5_patch.sql ==============

-- ============================================================
-- PATCH FASE 5 — corre isto no SQL Editor do Supabase Studio
-- (já tens o schema anterior instalado; isto só acrescenta o que é novo)
-- ============================================================

-- --------- Equipas adversárias ---------
create table if not exists equipas_adversarias (
    id uuid primary key default gen_random_uuid(),
    nome text not null unique,
    logo_url text
);

-- --------- Jogos: passar a usar equipa selecionada + cascade da competição ---------
alter table jogos add column if not exists adversario_id uuid references equipas_adversarias(id) on delete set null;
alter table jogos alter column adversario drop not null;

alter table jogos drop constraint if exists jogos_competicao_id_fkey;
alter table jogos add constraint jogos_competicao_id_fkey foreign key (competicao_id) references competicoes(id) on delete cascade;

-- --------- Competições: formato liga/taça + fases ---------
alter table competicoes add column if not exists formato text check (formato in ('liga','taca')) default 'liga';

create table if not exists competicao_fases (
    id uuid primary key default gen_random_uuid(),
    competicao_id uuid not null references competicoes(id) on delete cascade,
    ordem int not null,
    nome text not null,
    unique(competicao_id, ordem)
);
alter table jogos add column if not exists fase_id uuid references competicao_fases(id) on delete set null;

-- --------- Treinos: plano específico de guarda-redes ---------
alter table treinos add column if not exists plano_treino_gr_url text;

-- --------- Documentos ---------
create table if not exists documentos (
    id uuid primary key default gen_random_uuid(),
    titulo text not null,
    categoria text,
    ficheiro_url text not null,
    created_at timestamptz default now()
);

-- --------- Eventos de calendário (reuniões, etc.) ---------
create table if not exists eventos_calendario (
    id uuid primary key default gen_random_uuid(),
    titulo text not null,
    dia date not null,
    hora time,
    descricao text,
    created_at timestamptz default now()
);

-- --------- RLS ---------
alter table equipas_adversarias enable row level security;
alter table competicao_fases enable row level security;
alter table documentos enable row level security;
alter table eventos_calendario enable row level security;

drop policy if exists equipas_select on equipas_adversarias;
drop policy if exists equipas_treinador on equipas_adversarias;
create policy equipas_select on equipas_adversarias for select using (true);
create policy equipas_treinador on equipas_adversarias for all using (is_treinador()) with check (is_treinador());

drop policy if exists fases_select on competicao_fases;
drop policy if exists fases_treinador on competicao_fases;
create policy fases_select on competicao_fases for select using (true);
create policy fases_treinador on competicao_fases for all using (is_treinador()) with check (is_treinador());

drop policy if exists documentos_select on documentos;
drop policy if exists documentos_treinador on documentos;
create policy documentos_select on documentos for select using (true);
create policy documentos_treinador on documentos for all using (is_treinador()) with check (is_treinador());

drop policy if exists eventos_select on eventos_calendario;
drop policy if exists eventos_treinador on eventos_calendario;
create policy eventos_select on eventos_calendario for select using (true);
create policy eventos_treinador on eventos_calendario for all using (is_treinador()) with check (is_treinador());

-- --------- Storage: logos das equipas e documentos ---------
insert into storage.buckets (id, name, public) values ('equipas-logos','equipas-logos', true)
    on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documentos','documentos', true)
    on conflict (id) do nothing;

drop policy if exists "leitura publica logos equipas" on storage.objects;
drop policy if exists "treinador escreve logos equipas" on storage.objects;
drop policy if exists "treinador apaga logos equipas" on storage.objects;
create policy "leitura publica logos equipas" on storage.objects for select using (bucket_id = 'equipas-logos');
create policy "treinador escreve logos equipas" on storage.objects for insert with check (bucket_id = 'equipas-logos' and is_treinador());
create policy "treinador apaga logos equipas" on storage.objects for delete using (bucket_id = 'equipas-logos' and is_treinador());

drop policy if exists "leitura publica documentos" on storage.objects;
drop policy if exists "treinador escreve documentos" on storage.objects;
drop policy if exists "treinador apaga documentos" on storage.objects;
create policy "leitura publica documentos" on storage.objects for select using (bucket_id = 'documentos');
create policy "treinador escreve documentos" on storage.objects for insert with check (bucket_id = 'documentos' and is_treinador());
create policy "treinador apaga documentos" on storage.objects for delete using (bucket_id = 'documentos' and is_treinador());

-- --------- Realtime (estatísticas ao vivo durante o jogo) ---------
-- se der erro "already member of publication", ignora — já está ativo
DO $$ BEGIN alter publication supabase_realtime add table estatisticas_jogo; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN alter publication supabase_realtime add table jogos; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============== phase6_patch.sql ==============

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
DO $$ BEGIN alter publication supabase_realtime add table jogo_participantes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN alter publication supabase_realtime add table jogo_substituicoes; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============== phase7_patch.sql ==============

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

DO $$ BEGIN alter publication supabase_realtime add table jogo_configuracao; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN alter publication supabase_realtime add table jogo_estatisticas_coletivas; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============== phase8_patch.sql ==============

-- ============================================================
-- PATCH FASE 8 — mais estatísticas coletivas + tempo corrido/cronometrado
-- Corre isto no SQL Editor do Supabase Studio.
-- ============================================================

alter table jogo_estatisticas_coletivas add column if not exists perdas_bola_nos int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists perdas_bola_adversario int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists recuperacoes_bola_nos int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists recuperacoes_bola_adversario int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists passes_chave_nos int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists passes_chave_adversario int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists grandes_oportunidades_criadas_nos int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists grandes_oportunidades_criadas_adversario int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists grandes_oportunidades_falhadas_nos int not null default 0;
alter table jogo_estatisticas_coletivas add column if not exists grandes_oportunidades_falhadas_adversario int not null default 0;

alter table jogo_configuracao add column if not exists tipo_tempo text check (tipo_tempo in ('corrido','cronometrado')) default 'corrido';