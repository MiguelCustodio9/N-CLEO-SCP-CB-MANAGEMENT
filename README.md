# Núcleo SCP Castelo Branco — App de Futsal

Site estático (GitHub Pages) + base de dados Supabase, no mesmo estilo visual do projeto Kroos, adaptado para futsal.

## Estado atual
- ✅ **Fase 1 — Fundação + Plantel**: esquema completo da base de dados (todos os módulos), login por nome de utilizador (treinador/jogadora), design no estilo Kroos, e o Plantel completo (todos os campos pedidos, idade automática, capitania, notas escolares, acompanhamento físico/técnico nos 3 momentos, histórico clínico, ficha em PDF, criação de login da atleta).
- ✅ **Fase 3 — Jogos e Competições**: criar competições (nome/época/tipo); criar jogos (adversário, data/hora, local, casa/fora, jornada, competição associada, tática 1x2x1 / 2x2 / 4x0); editar resultado e fechar jogo; estatísticas individuais completas por jogo (minutos, golos marcados/sofridos, assistências, passes, passes-chave, remates, dribles, defesas, interceções, desarmes, perdas/recuperações de bola, erros que originaram golo, grandes oportunidades criadas/falhadas, cartões amarelos/vermelhos) com **classificação individual automática de 0 a 10** (algoritmo transparente em `js/rating.js`, fácil de afinar); links por jogo (vídeo, etc.); vista da jogadora com resultado, tática e as suas próprias estatísticas.

- ✅ **Fase 4 — Estatísticas e Calendário**: resumo da equipa (jogos, vitórias/empates/derrotas, golos marcados/sofridos), gráfico de evolução de golos por jogo, rankings (marcadoras, assistentes, classificação média, disciplina), distribuição de golos por posição, tabela completa por atleta com percentagem de conversão de remates, e filtro por competição. Calendário mensal com treinos e jogos, com clique direto para o detalhe de cada um.

## App completa — não há mais fases pendentes
Tudo o que foi pedido está implementado: Plantel, Treinos, Jogos, Competições, Estatísticas e Calendário, com as permissões de treinador/jogadora aplicadas em toda a parte (na interface e na base de dados via RLS — não é só visual).

Coisas que ainda dependes de ti para ligar:
1. Preencher `js/supabaseClient.js` com o URL e a anon key do teu projeto.
2. Correr `sql/schema.sql` (e o `sql/phase3_patch.sql` se já tinhas corrido uma versão anterior).
3. Fazer deploy da Edge Function `criar-utilizador` (ver secção 1 abaixo) para poderes criar logins de atletas.
4. Colocar o logo do clube em `assets/logo-clube.png`.
5. Publicar no GitHub Pages (secção 3 abaixo).

Se depois de testares quiseres afinações (cores, pesos do algoritmo de rating, mais estatísticas, etc.), é só dizeres.

---

## 1. Configurar o Supabase

1. Cria um projeto em [supabase.com](https://supabase.com).
2. Vai a **SQL Editor** e corre todo o ficheiro `sql/schema.sql`. Isto cria as tabelas, as políticas de segurança (RLS) e os *buckets* de storage (fotos, planos de treino, logo do clube).
3. Vai a **Project Settings → API** e copia o **Project URL** e a **anon public key**.
4. Abre `js/supabaseClient.js` e cola-os em `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

### Criar o primeiro treinador
Como não há registo público, o primeiro utilizador (treinador) tem de ser criado manualmente:
1. Em **Authentication → Users**, clica **Add user** → email `nome.utilizador@nucleoscp.app` (usa o nome de utilizador que quiseres, em minúsculas, sem espaços) e a password que quiseres. Marca "Auto Confirm User".
2. Em **Table Editor → perfis**, adiciona uma linha: `id` = o UUID do utilizador criado, `tipo_utilizador` = `treinador`, `nome_utilizador` = o nome que vais usar para entrar (a parte antes do `@nucleoscp.app`).
3. A partir daqui, o treinador já consegue criar contas de jogadoras diretamente pela app (ver abaixo).

### Deploy da Edge Function (para o treinador poder criar contas de jogadoras)
Como o site é estático (GitHub Pages), criar contas de forma segura precisa de uma pequena função no Supabase (a chave de administração nunca fica no site):

```bash
npm install -g supabase
supabase login
supabase link --project-ref TEU-PROJECT-REF
supabase functions deploy criar-utilizador
```

Sem este passo, tudo o resto funciona normalmente — só a criação de login de novas atletas fica indisponível até fazeres o deploy.

## 2. Colocar o logo do clube
Substitui `assets/logo-clube.png` pelo teu ficheiro (transparente, ideal ~200x200px). Aparece no login e na topbar.

## 3. Publicar no GitHub Pages
1. Cria um repositório novo no GitHub e faz upload de toda esta pasta (mantém a estrutura).
2. Em **Settings → Pages**, escolhe a branch `main` e a pasta `/ (root)`.
3. O site fica disponível em `https://o-teu-utilizador.github.io/nome-do-repositorio/`.

*(A pasta `supabase/functions` não é publicada no GitHub Pages — só é usada localmente para fazer o deploy da Edge Function para o Supabase.)*
