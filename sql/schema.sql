-- ============================================================
-- NÚCLEO SCP CASTELO BRANCO — FUTSAL APP
-- Schema completo para Supabase (Postgres)
-- Corre este ficheiro no SQL Editor do Supabase Studio.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PERFIS (ligado ao auth.users do Supabase)
-- ============================================================
create table if not exists perfis (
    id uuid primary key references auth.users(id) on delete cascade,
    tipo_utilizador text not null check (tipo_utilizador in ('treinador','jogador')),
    nome_utilizador text unique not null,
    created_at timestamptz default now()
);

-- ============================================================
-- 2. ATLETAS (plantel)
-- ============================================================
create table if not exists atletas (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references perfis(id) on delete set null,

    -- identificação
    nome text not null,
    nome_completo text,
    foto_url text,
    data_nascimento date,
    pais_nascimento text,
    nacionalidade text,
    dupla_nacionalidade text,
    contacto text,

    -- futsal
    escalao text check (escalao in (
        'Petiz (Sub-7)','Traquina (Sub-9)','Benjamim (Sub-11)','Infantil (Sub-13)',
        'Iniciada (Sub-15)','Juvenil (Sub-17)','Júnior (Sub-19)','Sénior (Sub-20+)'
    )),
    posicao text check (posicao in (
        'Guarda-Redes','Fixo','Ala','Pivot','Universal',
        'Fixo/Ala','Ala/Fixo','Fixo/Pivot','Pivot/Fixo','Ala/Pivot','Pivot/Ala'
    )),
    anos_pratica_federada numeric,
    clube_anterior text,
    desportos_extra text,
    atividades_extra text,

    -- encarregados de educação (se menor)
    nome_pai text,
    contacto_pai text,
    nome_mae text,
    contacto_mae text,
    email_encarregado text,

    -- escola
    escola text,
    ano_escolar text,
    disciplina_favorita text,

    -- capitania: 'capita' | 'vice_capita' | 'terceira_capita' | null
    capitania text check (capitania in ('capita','vice_capita','terceira_capita')),

    ativo boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- só pode haver uma titular de cada posto de capitania
create unique index if not exists uq_atletas_capitania on atletas(capitania) where capitania is not null;

-- ============================================================
-- 3. NOTAS ESCOLARES (disciplinas configuráveis + notas por período)
-- ============================================================
create table if not exists disciplinas_academicas (
    id uuid primary key default gen_random_uuid(),
    atleta_id uuid not null references atletas(id) on delete cascade,
    nome_disciplina text not null,
    num_periodos int not null default 3
);

create table if not exists notas_academicas (
    id uuid primary key default gen_random_uuid(),
    disciplina_id uuid not null references disciplinas_academicas(id) on delete cascade,
    periodo int not null,
    nota numeric,
    unique(disciplina_id, periodo)
);

-- ============================================================
-- 4. ACOMPANHAMENTO FÍSICO E TÉCNICO (3 momentos da época)
-- ============================================================
create table if not exists acompanhamento_fisico (
    id uuid primary key default gen_random_uuid(),
    atleta_id uuid not null references atletas(id) on delete cascade,
    momento text not null check (momento in ('inicio_epoca','meio_epoca','fim_epoca')),
    peso_kg numeric,
    altura_cm numeric,
    imc numeric generated always as (
        case when altura_cm is not null and altura_cm > 0 and peso_kg is not null
        then round((peso_kg / ((altura_cm/100.0)^2))::numeric, 2)
        else null end
    ) stored,
    data_registo date default current_date,
    unique(atleta_id, momento)
);

create table if not exists acompanhamento_tecnico (
    id uuid primary key default gen_random_uuid(),
    atleta_id uuid not null references atletas(id) on delete cascade,
    momento text not null check (momento in ('inicio_epoca','meio_epoca','fim_epoca')),
    passe numeric,
    recepcao_controlo_dominio numeric,
    conducao numeric,
    remate numeric,
    data_registo date default current_date,
    unique(atleta_id, momento)
);

-- ============================================================
-- 5. HISTÓRICO CLÍNICO E DE SAÚDE (lesões, medicação, outros)
-- ============================================================
create table if not exists historico_clinico (
    id uuid primary key default gen_random_uuid(),
    atleta_id uuid not null references atletas(id) on delete cascade,
    tipo text not null check (tipo in ('lesao','medicacao','problema_saude')),
    titulo text not null,
    descricao text,
    data_inicio date,
    data_fim date,
    ativo boolean default true,
    created_at timestamptz default now()
);

-- ============================================================
-- 6. TREINOS
-- ============================================================
create table if not exists treinos (
    id uuid primary key default gen_random_uuid(),
    numero int not null unique,
    dia date not null,
    hora_inicio time,
    hora_fim time,
    local text,
    plano_treino_url text,
    fechado boolean default false,
    created_at timestamptz default now()
);

create table if not exists presencas_treino (
    id uuid primary key default gen_random_uuid(),
    treino_id uuid not null references treinos(id) on delete cascade,
    atleta_id uuid not null references atletas(id) on delete cascade,
    estado text check (estado in ('presente','falta_justificada','falta_injustificada','lesionado')),
    unique(treino_id, atleta_id)
);

create table if not exists avaliacoes_esforco (
    id uuid primary key default gen_random_uuid(),
    treino_id uuid not null references treinos(id) on delete cascade,
    atleta_id uuid not null references atletas(id) on delete cascade,
    valor int check (valor between 1 and 5),
    unique(treino_id, atleta_id)
);

-- ============================================================
-- 7. COMPETIÇÕES E JOGOS
-- ============================================================
create table if not exists competicoes (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    epoca text,
    tipo text
);

create table if not exists jogos (
    id uuid primary key default gen_random_uuid(),
    competicao_id uuid references competicoes(id) on delete set null,
    jornada text,
    adversario text not null,
    data date,
    hora time,
    local text,
    casa_fora text check (casa_fora in ('casa','fora')),
    tatica text check (tatica in ('1x2x1','2x2','4x0')),
    golos_equipa int default 0,
    golos_adversario int default 0,
    fechado boolean default false,
    created_at timestamptz default now()
);

create table if not exists jogos_links (
    id uuid primary key default gen_random_uuid(),
    jogo_id uuid not null references jogos(id) on delete cascade,
    titulo text,
    url text not null
);

-- ============================================================
-- 8. ESTATÍSTICAS INDIVIDUAIS POR JOGO
-- ============================================================
create table if not exists estatisticas_jogo (
    id uuid primary key default gen_random_uuid(),
    jogo_id uuid not null references jogos(id) on delete cascade,
    atleta_id uuid not null references atletas(id) on delete cascade,

    minutos_jogados int default 0,
    golos_marcados int default 0,
    golos_sofridos int default 0,
    assistencias int default 0,
    passes int default 0,
    passes_chave int default 0,
    remates int default 0,
    dribles int default 0,
    defesas int default 0,
    intercecoes int default 0,
    desarmes int default 0,
    perdas_bola int default 0,
    recuperacoes_bola int default 0,
    erros_originaram_golo int default 0,
    grandes_oportunidades_criadas int default 0,
    grandes_oportunidades_falhadas int default 0,
    cartoes_amarelos int default 0,
    cartoes_vermelhos int default 0,

    -- classificação 0-10 calculada pelo algoritmo (ver js/rating.js)
    classificacao_media numeric,

    unique(jogo_id, atleta_id)
);

-- ============================================================
-- FUNÇÕES DE APOIO A RLS
-- ============================================================
create or replace function is_treinador() returns boolean
language sql stable security definer as $$
    select exists (
        select 1 from perfis where id = auth.uid() and tipo_utilizador = 'treinador'
    );
$$;

create or replace function meu_atleta_id() returns uuid
language sql stable security definer as $$
    select id from atletas where user_id = auth.uid();
$$;

-- ============================================================
-- VISTA PÚBLICA DO PLANTEL (o que uma jogadora pode ver das colegas)
-- ============================================================
create or replace view plantel_publico as
select id, nome, foto_url, escalao, posicao, capitania, ativo
from atletas;

-- ============================================================
-- RLS
-- ============================================================
alter table perfis enable row level security;
alter table atletas enable row level security;
alter table disciplinas_academicas enable row level security;
alter table notas_academicas enable row level security;
alter table acompanhamento_fisico enable row level security;
alter table acompanhamento_tecnico enable row level security;
alter table historico_clinico enable row level security;
alter table treinos enable row level security;
alter table presencas_treino enable row level security;
alter table avaliacoes_esforco enable row level security;
alter table competicoes enable row level security;
alter table jogos enable row level security;
alter table jogos_links enable row level security;
alter table estatisticas_jogo enable row level security;

-- perfis: cada um vê o seu; treinador vê todos
create policy perfis_self on perfis for select using (id = auth.uid() or is_treinador());
create policy perfis_treinador_gere on perfis for all using (is_treinador()) with check (is_treinador());

-- atletas: treinador tudo; jogadora só a sua ficha completa
create policy atletas_treinador on atletas for all using (is_treinador()) with check (is_treinador());
create policy atletas_propria on atletas for select using (user_id = auth.uid());

-- dados sensíveis (académico, físico, técnico, clínico): treinador tudo, jogadora só o seu
create policy disc_treinador on disciplinas_academicas for all using (is_treinador()) with check (is_treinador());
create policy disc_propria on disciplinas_academicas for select using (atleta_id = meu_atleta_id());

create policy notas_treinador on notas_academicas for all using (is_treinador()) with check (is_treinador());
create policy notas_propria on notas_academicas for select using (
    disciplina_id in (select id from disciplinas_academicas where atleta_id = meu_atleta_id())
);

create policy fisico_treinador on acompanhamento_fisico for all using (is_treinador()) with check (is_treinador());
create policy fisico_propria on acompanhamento_fisico for select using (atleta_id = meu_atleta_id());

create policy tecnico_treinador on acompanhamento_tecnico for all using (is_treinador()) with check (is_treinador());
create policy tecnico_propria on acompanhamento_tecnico for select using (atleta_id = meu_atleta_id());

create policy clinico_treinador on historico_clinico for all using (is_treinador()) with check (is_treinador());
create policy clinico_propria on historico_clinico for select using (atleta_id = meu_atleta_id());

-- treinos: toda a gente vê; só treinador edita
create policy treinos_select on treinos for select using (true);
create policy treinos_treinador on treinos for all using (is_treinador()) with check (is_treinador());

-- presenças: treinador tudo; jogadora só a sua linha
create policy presencas_treinador on presencas_treino for all using (is_treinador()) with check (is_treinador());
create policy presencas_propria on presencas_treino for select using (atleta_id = meu_atleta_id());

-- avaliação de esforço: treinador tudo; jogadora regista/vê a sua, só em treino aberto
create policy esforco_treinador on avaliacoes_esforco for all using (is_treinador()) with check (is_treinador());
create policy esforco_propria_select on avaliacoes_esforco for select using (atleta_id = meu_atleta_id());
create policy esforco_propria_upsert on avaliacoes_esforco for insert with check (
    atleta_id = meu_atleta_id()
    and exists (select 1 from treinos t where t.id = treino_id and t.fechado = false)
);
create policy esforco_propria_update on avaliacoes_esforco for update using (
    atleta_id = meu_atleta_id()
    and exists (select 1 from treinos t where t.id = treino_id and t.fechado = false)
);

-- competições / jogos: toda a gente vê; só treinador edita
create policy competicoes_select on competicoes for select using (true);
create policy competicoes_treinador on competicoes for all using (is_treinador()) with check (is_treinador());

create policy jogos_select on jogos for select using (true);
create policy jogos_treinador on jogos for all using (is_treinador()) with check (is_treinador());

create policy jogos_links_select on jogos_links for select using (true);
create policy jogos_links_treinador on jogos_links for all using (is_treinador()) with check (is_treinador());

-- estatísticas de jogo: treinador tudo; estatísticas de desempenho são visíveis
-- a toda a equipa (necessário para rankings/estatísticas), ao contrário dos
-- dados pessoais/clínicos que continuam privados por atleta
create policy stats_treinador on estatisticas_jogo for all using (is_treinador()) with check (is_treinador());
create policy stats_select_equipa on estatisticas_jogo for select using (true);

-- ============================================================
-- STORAGE BUCKETS (correr também no separador Storage, ou aqui via SQL)
-- ============================================================
insert into storage.buckets (id, name, public) values ('fotos-atletas','fotos-atletas', true)
    on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('planos-treino','planos-treino', true)
    on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('clube','clube', true)
    on conflict (id) do nothing;

create policy "leitura publica fotos" on storage.objects for select using (bucket_id = 'fotos-atletas');
create policy "treinador escreve fotos" on storage.objects for insert with check (bucket_id = 'fotos-atletas' and is_treinador());
create policy "treinador atualiza fotos" on storage.objects for update using (bucket_id = 'fotos-atletas' and is_treinador());
create policy "treinador apaga fotos" on storage.objects for delete using (bucket_id = 'fotos-atletas' and is_treinador());

create policy "leitura publica planos" on storage.objects for select using (bucket_id = 'planos-treino');
create policy "treinador escreve planos" on storage.objects for insert with check (bucket_id = 'planos-treino' and is_treinador());
create policy "treinador apaga planos" on storage.objects for delete using (bucket_id = 'planos-treino' and is_treinador());
