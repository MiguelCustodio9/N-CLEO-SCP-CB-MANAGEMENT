// ============================================================
// ESTATÍSTICAS — estatisticas.js
// ============================================================

let GRAFICOS_ATIVOS = [];

async function carregarFiltroCompeticoesEstatisticas() {
    const { data } = await supabase.from('competicoes').select('*').order('epoca', { ascending: false });
    const sel = document.getElementById('est_filtro_competicao');
    if (!sel) return;
    sel.innerHTML = `<option value="">Todas as competições</option>` + (data || []).map(c => `<option value="${c.id}">${c.nome} (${c.epoca || ''})</option>`).join('');
    sel.onchange = () => carregarEstatisticas();
}

async function carregarEstatisticas() {
    const competicaoId = document.getElementById('est_filtro_competicao')?.value || '';

    let queryJogos = supabase.from('jogos').select('*').eq('fechado', true);
    if (competicaoId) queryJogos = queryJogos.eq('competicao_id', competicaoId);
    const { data: jogos, error: erroJogos } = await queryJogos.order('data');
    if (erroJogos) { mostrarToast('Erro: ' + erroJogos.message, 'error'); return; }

    if (!jogos.length) {
        document.getElementById('estatisticasConteudo').innerHTML = `<div class="card empty-state"><div class="ico">📊</div>Ainda não há jogos fechados com estatísticas para mostrar.</div>`;
        return;
    }

    const idsJogos = jogos.map(j => j.id);
    const { data: stats, error: erroStats } = await supabase.from('estatisticas_jogo').select('*, atletas(nome, posicao, foto_url)').in('jogo_id', idsJogos);
    if (erroStats) { mostrarToast('Erro: ' + erroStats.message, 'error'); return; }

    renderEstatisticas(jogos, stats || []);
}

function renderEstatisticas(jogos, stats) {
    // --------- resumo da equipa ---------
    let vitorias = 0, empates = 0, derrotas = 0, golosMarcados = 0, golosSofridos = 0;
    jogos.forEach(j => {
        golosMarcados += j.golos_equipa || 0;
        golosSofridos += j.golos_adversario || 0;
        if (j.golos_equipa > j.golos_adversario) vitorias++;
        else if (j.golos_equipa === j.golos_adversario) empates++;
        else derrotas++;
    });

    // --------- agregados por atleta ---------
    const porAtleta = {};
    stats.forEach(s => {
        const id = s.atleta_id;
        if (!porAtleta[id]) {
            porAtleta[id] = {
                nome: s.atletas?.nome || '—', posicao: s.atletas?.posicao || '', foto_url: s.atletas?.foto_url,
                jogos: 0, minutos: 0, golos: 0, assistencias: 0, remates: 0, passes: 0, passes_chave: 0,
                dribles: 0, defesas: 0, golos_sofridos: 0, intercecoes: 0, desarmes: 0, perdas_bola: 0,
                recuperacoes_bola: 0, erros_originaram_golo: 0, goc: 0, gof: 0, amarelos: 0, vermelhos: 0,
                somaRating: 0, jogosComRating: 0,
            };
        }
        const a = porAtleta[id];
        if (s.minutos_jogados > 0) a.jogos++;
        a.minutos += s.minutos_jogados || 0;
        a.golos += s.golos_marcados || 0;
        a.assistencias += s.assistencias || 0;
        a.remates += s.remates || 0;
        a.passes += s.passes || 0;
        a.passes_chave += s.passes_chave || 0;
        a.dribles += s.dribles || 0;
        a.defesas += s.defesas || 0;
        a.golos_sofridos += s.golos_sofridos || 0;
        a.intercecoes += s.intercecoes || 0;
        a.desarmes += s.desarmes || 0;
        a.perdas_bola += s.perdas_bola || 0;
        a.recuperacoes_bola += s.recuperacoes_bola || 0;
        a.erros_originaram_golo += s.erros_originaram_golo || 0;
        a.goc += s.grandes_oportunidades_criadas || 0;
        a.gof += s.grandes_oportunidades_falhadas || 0;
        a.amarelos += s.cartoes_amarelos || 0;
        a.vermelhos += s.cartoes_vermelhos || 0;
        if (s.classificacao_media != null) { a.somaRating += s.classificacao_media; a.jogosComRating++; }
    });
    const atletas = Object.values(porAtleta);
    atletas.forEach(a => {
        a.mediaRating = a.jogosComRating ? Math.round((a.somaRating / a.jogosComRating) * 10) / 10 : null;
        a.percRemateGolo = a.remates ? Math.round((a.golos / a.remates) * 1000) / 10 : 0;
        a.precisaoPasseChave = a.passes ? Math.round((a.passes_chave / a.passes) * 1000) / 10 : 0;
    });

    const top = (campo, n = 5) => [...atletas].sort((x, y) => (y[campo] || 0) - (x[campo] || 0)).slice(0, n).filter(a => a[campo] > 0);
    const topRating = [...atletas].filter(a => a.jogosComRating >= 1).sort((x, y) => y.mediaRating - x.mediaRating).slice(0, 5);

    const el = document.getElementById('estatisticasConteudo');
    el.innerHTML = `
        <div class="grid grid-6">
            ${cartaoResumo(jogos.length, 'Jogos')}
            ${cartaoResumo(vitorias, 'Vitórias', 'badge-green')}
            ${cartaoResumo(empates, 'Empates', 'badge-gray')}
            ${cartaoResumo(derrotas, 'Derrotas', 'badge-red')}
            ${cartaoResumo(golosMarcados, 'Golos marcados')}
            ${cartaoResumo(golosSofridos, 'Golos sofridos')}
        </div>

        <div class="card">
            <fieldset><legend>Evolução de golos por jogo</legend><canvas id="graficoGolos" height="90"></canvas></fieldset>
        </div>

        <div class="grid grid-2">
            <div class="card">
                <fieldset><legend>🥇 Melhores marcadoras</legend>${tabelaRanking(top('golos'), 'golos', 'Golos')}</fieldset>
            </div>
            <div class="card">
                <fieldset><legend>🎯 Melhores assistentes</legend>${tabelaRanking(top('assistencias'), 'assistencias', 'Assist.')}</fieldset>
            </div>
        </div>

        <div class="grid grid-2">
            <div class="card">
                <fieldset><legend>⭐ Melhor classificação média</legend>${tabelaRanking(topRating, 'mediaRating', 'Rating')}</fieldset>
            </div>
            <div class="card">
                <fieldset><legend>🟨🟥 Disciplina</legend>${tabelaDisciplina([...atletas].sort((x,y)=>(y.amarelos+y.vermelhos*2)-(x.amarelos+x.vermelhos*2)).slice(0,5).filter(a=>a.amarelos+a.vermelhos>0))}</fieldset>
            </div>
        </div>

        <div class="card">
            <fieldset><legend>📈 Distribuição de golos por posição</legend><canvas id="graficoPosicoes" height="90"></canvas></fieldset>
        </div>

        <div class="card">
            <fieldset><legend>Estatísticas completas por atleta</legend>
                <div style="overflow-x:auto;">
                <table>
                    <thead><tr>
                        <th>Atleta</th><th>J</th><th>Min</th><th>Golos</th><th>Assist.</th><th>Remates</th><th>% Conversão</th>
                        <th>Dribles</th><th>Defesas</th><th>Interceções</th><th>Desarmes</th><th>Perdas</th><th>Recup.</th>
                        <th>G.O. criadas</th><th>G.O. falhadas</th><th>🟨</th><th>🟥</th><th>Rating méd.</th>
                    </tr></thead>
                    <tbody>
                    ${atletas.sort((x,y)=>y.golos-x.golos).map(a => `
                        <tr>
                            <td><strong>${a.nome}</strong></td><td>${a.jogos}</td><td>${a.minutos}</td>
                            <td>${a.golos}</td><td>${a.assistencias}</td><td>${a.remates}</td><td>${a.percRemateGolo}%</td>
                            <td>${a.dribles}</td><td>${a.defesas}</td><td>${a.intercecoes}</td><td>${a.desarmes}</td>
                            <td>${a.perdas_bola}</td><td>${a.recuperacoes_bola}</td><td>${a.goc}</td><td>${a.gof}</td>
                            <td>${a.amarelos}</td><td>${a.vermelhos}</td>
                            <td>${a.mediaRating != null ? `<span class="badge badge-blue">${a.mediaRating}</span>` : '—'}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
                </div>
            </fieldset>
        </div>
    `;

    desenharGraficos(jogos, atletas);
}

function cartaoResumo(valor, label, corBadge) {
    return `<div class="card" style="text-align:center; padding:18px;">
        <div style="font-size:28px; font-weight:800;">${valor}</div>
        <div class="page-subtitle" style="margin:2px 0 0;">${label}</div>
    </div>`;
}

function tabelaRanking(lista, campo, labelCampo) {
    if (!lista.length) return '<div class="empty-state" style="padding:20px;">Sem dados suficientes.</div>';
    return `<table><tbody>
        ${lista.map((a, i) => `<tr><td>${i + 1}.</td><td>${a.nome}</td><td style="text-align:right;"><strong>${a[campo]}</strong> ${labelCampo}</td></tr>`).join('')}
    </tbody></table>`;
}
function tabelaDisciplina(lista) {
    if (!lista.length) return '<div class="empty-state" style="padding:20px;">Sem cartões registados. 🎉</div>';
    return `<table><tbody>
        ${lista.map(a => `<tr><td>${a.nome}</td><td style="text-align:right;">🟨 ${a.amarelos}&nbsp;&nbsp;🟥 ${a.vermelhos}</td></tr>`).join('')}
    </tbody></table>`;
}

function desenharGraficos(jogos, atletas) {
    GRAFICOS_ATIVOS.forEach(g => g.destroy());
    GRAFICOS_ATIVOS = [];

    const ctxGolos = document.getElementById('graficoGolos');
    if (ctxGolos) {
        GRAFICOS_ATIVOS.push(new Chart(ctxGolos, {
            type: 'line',
            data: {
                labels: jogos.map(j => formatarData(j.data) + ' vs ' + j.adversario),
                datasets: [
                    { label: 'Núcleo SCP CB', data: jogos.map(j => j.golos_equipa || 0), borderColor: '#0a7a3c', backgroundColor: 'rgba(10,122,60,.15)', tension: .3, fill: true },
                    { label: 'Adversário', data: jogos.map(j => j.golos_adversario || 0), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', tension: .3, fill: true },
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        }));
    }

    const ctxPos = document.getElementById('graficoPosicoes');
    if (ctxPos) {
        const porPosicao = {};
        atletas.forEach(a => { porPosicao[a.posicao || 'Sem posição'] = (porPosicao[a.posicao || 'Sem posição'] || 0) + a.golos; });
        GRAFICOS_ATIVOS.push(new Chart(ctxPos, {
            type: 'doughnut',
            data: {
                labels: Object.keys(porPosicao),
                datasets: [{ data: Object.values(porPosicao), backgroundColor: ['#0a7a3c','#16a34a','#0ea5e9','#f97316','#ef4444','#6366f1','#a855f7'] }]
            },
            options: { responsive: true, plugins: { legend: { position: 'right' } } }
        }));
    }
}
