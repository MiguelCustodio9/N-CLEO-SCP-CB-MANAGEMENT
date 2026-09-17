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
alter publication supabase_realtime add table estatisticas_jogo;
alter publication supabase_realtime add table jogos;
