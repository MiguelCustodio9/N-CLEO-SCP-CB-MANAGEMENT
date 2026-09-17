-- Patch da Fase 3: torna as estatísticas de jogo visíveis a toda a equipa
-- (o desempenho em jogo não é "informação pessoal" — é preciso para os
-- rankings e estatísticas coletivas). Corre isto no SQL Editor se já
-- tinhas corrido o schema.sql da Fase 1/2 antes desta atualização.

drop policy if exists stats_propria on estatisticas_jogo;
drop policy if exists stats_select_equipa on estatisticas_jogo;
create policy stats_select_equipa on estatisticas_jogo for select using (true);
