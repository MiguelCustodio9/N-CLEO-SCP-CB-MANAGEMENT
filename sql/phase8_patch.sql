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
