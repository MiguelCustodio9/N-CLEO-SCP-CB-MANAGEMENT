# Núcleo SCP Castelo Branco — App de Futsal

Site estático (GitHub Pages) + base de dados Supabase, no mesmo estilo visual do projeto Kroos, adaptado para futsal.

## Estado atual
- ✅ **Fase 1 — Fundação + Plantel**: esquema completo da base de dados (todos os módulos), login por nome de utilizador (treinador/jogadora), design no estilo Kroos, e o Plantel completo (todos os campos pedidos, idade automática, capitania, notas escolares, acompanhamento físico/técnico nos 3 momentos, histórico clínico, ficha em PDF, criação de login da atleta).
- ✅ **Fase 2 — Treinos**: número automático, dia/horário/local, upload do plano de treino, folha de presenças (presente/falta justificada/falta injustificada/lesionado), avaliação de esforço 1–5, fecho do treino, e PDFs de presenças e de esforço.
- ✅ **Fase 3 — Jogos e Competições**: criar competições (nome/época/tipo); criar jogos (adversário, data/hora, local, casa/fora, jornada, competição associada, tática 1x2x1 / 2x2 / 4x0); editar resultado e fechar jogo; estatísticas individuais completas por jogo (minutos, golos marcados/sofridos, assistências, passes, passes-chave, remates, dribles, defesas, interceções, desarmes, perdas/recuperações de bola, erros que originaram golo, grandes oportunidades criadas/falhadas, cartões amarelos/vermelhos) com **classificação individual automática de 0 a 10** (algoritmo transparente em `js/rating.js`, fácil de afinar); links por jogo (vídeo, etc.); vista da jogadora com resultado, tática e as suas próprias estatísticas.
- ✅ **Fase 4 — Estatísticas e Calendário**: resumo da equipa (jogos, vitórias/empates/derrotas, golos marcados/sofridos), gráfico de evolução de golos por jogo, rankings (marcadoras, assistentes, classificação média, disciplina), distribuição de golos por posição, tabela completa por atleta com percentagem de conversão de remates, e filtro por competição. Calendário mensal com treinos e jogos, com clique direto para o detalhe de cada um.
- ✅ **Equipa Técnica**: o treinador já pode criar outras contas de treinador diretamente pela app (menu "Equipa Técnica"), sem precisar de voltar ao Supabase Studio — só a primeira conta (a tua) precisa de ser criada manualmente, como explicado abaixo.

## App completa
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
Como não há registo público, o primeiro utilizador (treinador) tem de ser criado manualmente — é o único que precisas de fazer assim:
1. Em **Authentication → Users**, clica **Add user** → email `nome.utilizador@nucleoscp.app` (usa o nome de utilizador que quiseres, em minúsculas, sem espaços) e a password que quiseres. Marca "Auto Confirm User".
2. Em **Table Editor → perfis**, adiciona uma linha: `id` = o UUID do utilizador criado, `tipo_utilizador` = `treinador`, `nome_utilizador` = o nome que vais usar para entrar (a parte antes do `@nucleoscp.app`).
3. A partir daqui, este treinador já consegue criar contas de jogadoras **e de outros treinadores** diretamente pela app (menus "Plantel" e "Equipa Técnica"), sem voltar a mexer no Supabase Studio.

### Deploy da Edge Function (para poderes criar contas pela app)
Como o site é estático (GitHub Pages), criar contas de forma segura precisa de uma pequena função no Supabase (a chave de administração nunca fica no site):

```bash
npm install -g supabase
supabase login
supabase link --project-ref TEU-PROJECT-REF
supabase functions deploy criar-utilizador
```

Sem este passo, tudo o resto funciona normalmente — só a criação de logins (jogadoras ou treinadores) pela app fica indisponível até fazeres o deploy.

## 2. Colocar o logo do clube
Substitui `assets/logo-clube.png` pelo teu ficheiro (transparente, ideal ~200x200px). Aparece no login e na topbar.

## 3. Publicar no GitHub Pages
1. Cria um repositório novo no GitHub e faz upload de toda esta pasta (mantém a estrutura).
2. Em **Settings → Pages**, escolhe a branch `main` e a pasta `/ (root)`.
3. O site fica disponível em `https://o-teu-utilizador.github.io/nome-do-repositorio/`.

*(A pasta `supabase/functions` não é publicada no GitHub Pages — só é usada localmente para fazer o deploy da Edge Function para o Supabase.)*

## Fase 5 — atualizações mais recentes

⚠️ **Como já tinhas a base de dados criada, corre `sql/phase5_patch.sql` no SQL Editor do Supabase** antes de testares estas novidades. Também precisas de voltar a fazer deploy da Edge Function (o código mudou):
```bash
supabase functions deploy criar-utilizador
```

O que foi adicionado/corrigido:
- **Foto da atleta**: passou de um campo de URL para upload direto de ficheiro (separador "Dados" da ficha), guardado no Storage do Supabase.
- **Fichas em PDF mais cuidadas**: a ficha individual, a folha de presenças e a avaliação de esforço passaram a ter cabeçalho/rodapé com as cores do clube, logótipo e tabelas alinhadas. *(Nota: não é possível gerar a partir de LaTeX real — isso precisaria de um motor de compilação que não existe num site estático — mas o resultado visual é equivalente.)*
- **Eliminar treinos e eliminar jogos**: passaram a ter botão próprio.
- **Equipas Adversárias** (menu novo): cria equipas com logótipo; ao criar um jogo, escolhes a equipa por lista em vez de escreveres o nome.
- **Competições com formato Liga ou Taça**: no formato Taça defines as fases (nome de cada uma) e depois associas jogos a cada fase; no formato Liga tens uma tabela com o registo da nossa equipa (V/E/D/GM/GS/Pts) — não é a classificação completa da liga, porque não temos dados dos jogos entre os outros clubes.
- **Eliminar uma competição elimina também os jogos associados** (antes só desassociava).
- **Plano de treino específico de guarda-redes**: só visível às atletas com posição "Guarda-Redes".
- **Estatísticas de jogo em tempo real**: se abrires um jogo em aberto enquanto o treinador atualiza as estatísticas, o ecrã atualiza-se sozinho (Supabase Realtime), sem precisares de dar refresh.
- **Eventos personalizados no calendário** (reuniões, etc.), além de treinos e jogos.
- **Documentos** (menu novo): título + categoria opcional + ficheiro anexado (ex: regulamento interno).
- **Ícones da barra lateral** substituídos por SVGs simples, em vez de emojis.
- **Convocatória, titulares, suplentes e substituições** (novo separador "Convocatória" dentro de cada jogo): marcas quem foi convocada, monta-se o onze inicial num relvado visual com as posições da tática escolhida (1x2x1 / 2x2 / 4x0), define-se o banco, e registam-se substituições com o minuto. Atualiza-se ao vivo (Realtime) tal como as estatísticas. *(Não incluí o cronómetro de jogo ao vivo do projeto original — partes, minutos a contar, etc. — por ser uma funcionalidade bastante mais complexa; diz se a quiseres mesmo e faço-a a seguir.)*

⚠️ **Novo patch a correr**: `sql/phase6_patch.sql` (para além dos anteriores, se ainda não os tiveres corrido).

## Fase 7 — cronómetro ao vivo + estatísticas coletivas

⚠️ **Novo patch a correr**: `sql/phase7_patch.sql`

- **Cronómetro de jogo ao vivo** (separador "Ao Vivo" em cada jogo): configuras nº de partes e minutos por parte, depois Iniciar / Pausar / Retomar / Terminar Parte / Terminar Jogo. O relógio conta em tempo real e atualiza-se sozinho em todos os ecrãs a ver esse jogo (Realtime) — não precisa de estar ninguém a carregar em nada para continuar a contar.
- **Estatísticas coletivas** (Nós vs Adversário): remates, remates à baliza, dribles tentados/conseguidos, defesas, cantos, passes, passes certos e faltas — cada uma com botões **+ / −** para ajustares rápido durante o jogo, sem teclado.
- **Posse de bola**: três botões (Nós / Parada / Adversário) que vão contando o tempo de posse de cada lado enquanto o cronómetro está a decorrer, com uma barra de percentagem ao vivo.
- **Botões + / − também na modal de estatísticas individuais** de cada atleta (Convocatória/Estatísticas), para não teres de escrever números à mão durante o jogo.

## Fase 8 — mais estatísticas coletivas + tempo corrido/cronometrado

⚠️ **Novo patch a correr**: `sql/phase8_patch.sql`

- **Perdas e recuperações de bola** adicionadas às estatísticas coletivas (já existiam nas individuais).
- **Grandes oportunidades (criadas e falhadas) e passes-chave** adicionadas às estatísticas coletivas (já existiam nas individuais).
- **Tempo corrido vs. cronometrado**: ao iniciar o jogo, escolhes um dos dois. Em "tempo corrido" o relógio conta sempre, do início ao fim da parte, como até aqui. Em "tempo cronometrado", o relógio só conta enquanto alguém (nós ou o adversário) tem a posse de bola — assim que marcas "Parada" no separador Posse de Bola, o cronómetro pára sozinho, e volta a contar automaticamente assim que voltas a marcar quem tem a bola.
