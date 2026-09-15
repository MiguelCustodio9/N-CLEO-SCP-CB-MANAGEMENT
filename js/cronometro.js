// ============================================================
// CRONÓMETRO AO VIVO + ESTATÍSTICAS COLETIVAS — cronometro.js
// ============================================================

let CONFIG_JOGO_ATUAL = null;
let COLETIVAS_JOGO_ATUAL = null;
let CRONOMETRO_INTERVAL = null;

const CAMPOS_COLETIVAS = [
    ['remates_nos', 'remates_adversario', 'Remates'],
    ['remates_baliza_nos', 'remates_baliza_adversario', 'Remates à baliza'],
    ['dribles_tentados_nos', 'dribles_tentados_adversario', 'Dribles tentados'],
    ['dribles_conseguidos_nos', 'dribles_conseguidos_adversario', 'Dribles conseguidos'],
    ['defesas_nos', 'defesas_adversario', 'Defesas'],
    ['cantos_nos', 'cantos_adversario', 'Cantos'],
    ['passes_nos', 'passes_adversario', 'Passes'],
    ['passes_certos_nos', 'passes_certos_adversario', 'Passes certos'],
    ['passes_chave_nos', 'passes_chave_adversario', 'Passes-chave'],
    ['perdas_bola_nos', 'perdas_bola_adversario', 'Perdas de bola'],
    ['recuperacoes_bola_nos', 'recuperacoes_bola_adversario', 'Recuperações de bola'],
    ['grandes_oportunidades_criadas_nos', 'grandes_oportunidades_criadas_adversario', 'Grandes oportunidades criadas'],
    ['grandes_oportunidades_falhadas_nos', 'grandes_oportunidades_falhadas_adversario', 'Grandes oportunidades falhadas'],
    ['faltas_nos', 'faltas_adversario', 'Faltas'],
];

function segundosAtuaisRelogio(config) {
    if (!config) return 0;
    let s = config.segundos_acumulados || 0;
    if (config.estado === 'a_decorrer' && config.iniciado_em) {
        s += Math.floor((Date.now() - new Date(config.iniciado_em).getTime()) / 1000);
    }
    return Math.max(0, s);
}
function formatarMMSS(totalSegundos) {
    const m = Math.floor(totalSegundos / 60);
    const s = totalSegundos % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function segundosPosseAtuais(col, lado) {
    if (!col) return 0;
    let s = (lado === 'nos' ? col.posse_nos_segundos : col.posse_adversario_segundos) || 0;
    if (col.posse_atual === lado && col.posse_desde && CONFIG_JOGO_ATUAL?.estado === 'a_decorrer') {
        s += Math.floor((Date.now() - new Date(col.posse_desde).getTime()) / 1000);
    }
    return Math.max(0, s);
}

async function renderAoVivo(el) {
    const jogoId = JOGO_ATUAL.id;
    const { data: config } = await supabase.from('jogo_configuracao').select('*').eq('jogo_id', jogoId).maybeSingle();
    const { data: coletivas } = await supabase.from('jogo_estatisticas_coletivas').select('*').eq('jogo_id', jogoId).maybeSingle();
    CONFIG_JOGO_ATUAL = config || { jogo_id: jogoId, numero_partes: 2, minutos_por_parte: 20, parte_atual: 0, estado: 'parado', segundos_acumulados: 0, iniciado_em: null };
    COLETIVAS_JOGO_ATUAL = coletivas || { jogo_id: jogoId };

    el.innerHTML = `
        <div class="card">
            <fieldset><legend>Cronómetro</legend>
                <div id="cronometroConteudo"></div>
            </fieldset>
        </div>
        <div class="card">
            <fieldset><legend>Estatísticas coletivas — Núcleo SCP CB vs Adversário</legend>
                <div id="coletivasConteudo"></div>
            </fieldset>
        </div>
        <div class="card">
            <fieldset><legend>Posse de bola</legend>
                <div id="posseConteudo"></div>
            </fieldset>
        </div>
    `;

    desenharCronometro();
    desenharColetivas();
    desenharPosse();

    clearInterval(CRONOMETRO_INTERVAL);
    CRONOMETRO_INTERVAL = setInterval(() => {
        if (!document.getElementById('cronometroConteudo')) { clearInterval(CRONOMETRO_INTERVAL); return; }
        desenharCronometro();
        desenharPosse();
    }, 1000);
}

function pararIntervaloCronometro() { clearInterval(CRONOMETRO_INTERVAL); CRONOMETRO_INTERVAL = null; }

function desenharCronometro() {
    const c = CONFIG_JOGO_ATUAL;
    const el = document.getElementById('cronometroConteudo');
    if (!el) return;
    const segundos = segundosAtuaisRelogio(c);
    const limite = c.minutos_por_parte * 60;
    const corTempo = segundos > limite ? 'var(--danger)' : 'var(--ink)';

    let controlos = '';
    if (EH_TREINADOR) {
        if (c.estado === 'parado') {
            controlos = `
                <div class="grid grid-2" style="max-width:340px; margin:0 auto 10px;">
                    <div class="field" style="margin-bottom:0;"><label>Nº de partes</label><input type="number" id="cfg_partes" value="${c.numero_partes}" min="1" max="4"></div>
                    <div class="field" style="margin-bottom:0;"><label>Minutos por parte</label><input type="number" id="cfg_minutos" value="${c.minutos_por_parte}" min="1" max="60"></div>
                </div>
                <div class="field" style="max-width:340px; margin:0 auto 14px;">
                    <label>Tipo de tempo</label>
                    <select id="cfg_tipo_tempo">
                        <option value="corrido" ${c.tipo_tempo !== 'cronometrado' ? 'selected' : ''}>Tempo corrido (conta sempre)</option>
                        <option value="cronometrado" ${c.tipo_tempo === 'cronometrado' ? 'selected' : ''}>Tempo cronometrado (para quando a bola não está em jogo)</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="iniciarJogoAoVivo()">▶️ Iniciar Jogo</button>`;
        } else if (c.estado === 'a_decorrer') {
            controlos = `<button class="btn btn-secondary" onclick="pausarJogoAoVivo()">⏸️ Pausar</button>
                <button class="btn btn-danger" onclick="terminarParteAoVivo()">⏹️ Terminar Parte</button>`;
        } else if (c.estado === 'pausado') {
            controlos = `<button class="btn btn-primary" onclick="retomarJogoAoVivo()">▶️ Retomar</button>
                <button class="btn btn-danger" onclick="terminarParteAoVivo()">⏹️ Terminar Parte</button>`;
        } else if (c.estado === 'intervalo') {
            controlos = c.parte_atual < c.numero_partes
                ? `<button class="btn btn-primary" onclick="iniciarParteSeguinteAoVivo()">▶️ Iniciar Parte ${c.parte_atual + 1}</button>`
                : `<button class="btn btn-danger" onclick="terminarJogoAoVivo()">🏁 Terminar Jogo</button>`;
        } else if (c.estado === 'terminado') {
            controlos = `<span class="badge badge-gray">Jogo terminado</span>`;
        }
    }

    el.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:12px; color:var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.05em;">
                ${c.estado === 'parado' ? 'Por iniciar' : c.estado === 'intervalo' ? 'Intervalo' : c.estado === 'terminado' ? 'Terminado' : `Parte ${c.parte_atual} de ${c.numero_partes}`}
            </div>
            <div style="font-size:48px; font-weight:800; font-variant-numeric:tabular-nums; color:${corTempo}; margin:6px 0 10px;">${formatarMMSS(segundos)}</div>
            ${c.estado !== 'parado' ? `<div style="margin-bottom:14px;"><span class="badge ${c.tipo_tempo === 'cronometrado' ? 'badge-blue' : 'badge-gray'}">${c.tipo_tempo === 'cronometrado' ? 'Tempo cronometrado — para com a bola parada' : 'Tempo corrido'}</span></div>` : ''}
            ${controlos}
        </div>
    `;
}

async function iniciarJogoAoVivo() {
    const numero_partes = parseInt(document.getElementById('cfg_partes').value) || 2;
    const minutos_por_parte = parseInt(document.getElementById('cfg_minutos').value) || 20;
    const tipo_tempo = document.getElementById('cfg_tipo_tempo').value;
    // em tempo cronometrado o relógio só deve contar quando alguém tem a posse,
    // por isso arranca em pausa até o treinador escolher quem tem a bola
    const arrancaPausado = tipo_tempo === 'cronometrado';
    const payload = {
        jogo_id: JOGO_ATUAL.id, numero_partes, minutos_por_parte, tipo_tempo, parte_atual: 1,
        estado: arrancaPausado ? 'pausado' : 'a_decorrer',
        segundos_acumulados: 0,
        iniciado_em: arrancaPausado ? null : new Date().toISOString(),
    };
    const { error } = await supabase.from('jogo_configuracao').upsert(payload, { onConflict: 'jogo_id' });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    CONFIG_JOGO_ATUAL = payload;
    desenharCronometro();
    if (arrancaPausado) mostrarToast('Jogo pronto — escolhe quem tem a bola em "Posse de bola" para começar a contar.', 'success');
}

async function pausarJogoAoVivo() {
    const acumulado = segundosAtuaisRelogio(CONFIG_JOGO_ATUAL);
    await flushPosse();
    const { error } = await supabase.from('jogo_configuracao').update({ estado: 'pausado', segundos_acumulados: acumulado, iniciado_em: null }).eq('jogo_id', JOGO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    CONFIG_JOGO_ATUAL.estado = 'pausado'; CONFIG_JOGO_ATUAL.segundos_acumulados = acumulado; CONFIG_JOGO_ATUAL.iniciado_em = null;
    desenharCronometro();
}

async function retomarJogoAoVivo() {
    const iniciado_em = new Date().toISOString();
    const { error } = await supabase.from('jogo_configuracao').update({ estado: 'a_decorrer', iniciado_em }).eq('jogo_id', JOGO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    CONFIG_JOGO_ATUAL.estado = 'a_decorrer'; CONFIG_JOGO_ATUAL.iniciado_em = iniciado_em;
    desenharCronometro();
}

async function terminarParteAoVivo() {
    const acumulado = segundosAtuaisRelogio(CONFIG_JOGO_ATUAL);
    await flushPosse();
    const { error } = await supabase.from('jogo_configuracao').update({ estado: 'intervalo', segundos_acumulados: acumulado, iniciado_em: null }).eq('jogo_id', JOGO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    CONFIG_JOGO_ATUAL.estado = 'intervalo'; CONFIG_JOGO_ATUAL.segundos_acumulados = acumulado; CONFIG_JOGO_ATUAL.iniciado_em = null;
    desenharCronometro();
}

async function iniciarParteSeguinteAoVivo() {
    const parte_atual = CONFIG_JOGO_ATUAL.parte_atual + 1;
    const iniciado_em = new Date().toISOString();
    const { error } = await supabase.from('jogo_configuracao').update({ parte_atual, estado: 'a_decorrer', segundos_acumulados: 0, iniciado_em }).eq('jogo_id', JOGO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    Object.assign(CONFIG_JOGO_ATUAL, { parte_atual, estado: 'a_decorrer', segundos_acumulados: 0, iniciado_em });
    desenharCronometro();
}

async function terminarJogoAoVivo() {
    if (!confirm('Terminar o jogo? Isto também fecha o jogo (deixa de poder editar estatísticas).')) return;
    await supabase.from('jogo_configuracao').update({ estado: 'terminado' }).eq('jogo_id', JOGO_ATUAL.id);
    await supabase.from('jogos').update({ fechado: true }).eq('id', JOGO_ATUAL.id);
    mostrarToast('Jogo terminado.', 'success');
    abrirJogo(JOGO_ATUAL.id);
}

// -------- estatísticas coletivas (botões + / -) --------
function desenharColetivas() {
    const el = document.getElementById('coletivasConteudo');
    if (!el) return;
    const col = COLETIVAS_JOGO_ATUAL;
    el.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr auto 1fr; gap:8px 16px; align-items:center; max-width:480px; margin:0 auto;">
            <div style="text-align:center; font-size:12px; font-weight:700; color:var(--club);">NÓS</div>
            <div></div>
            <div style="text-align:center; font-size:12px; font-weight:700; color:var(--danger);">ADVERSÁRIO</div>
            ${CAMPOS_COLETIVAS.map(([campoNos, campoAdv, label]) => `
                <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                    ${EH_TREINADOR ? `<button class="btn btn-secondary btn-sm" onclick="alterarColetiva('${campoNos}', -1)">−</button>` : ''}
                    <span style="font-weight:800; min-width:22px; text-align:center;">${col[campoNos] || 0}</span>
                    ${EH_TREINADOR ? `<button class="btn btn-secondary btn-sm" onclick="alterarColetiva('${campoNos}', 1)">+</button>` : ''}
                </div>
                <div style="text-align:center; font-size:12px; color:var(--muted);">${label}</div>
                <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                    ${EH_TREINADOR ? `<button class="btn btn-secondary btn-sm" onclick="alterarColetiva('${campoAdv}', -1)">−</button>` : ''}
                    <span style="font-weight:800; min-width:22px; text-align:center;">${col[campoAdv] || 0}</span>
                    ${EH_TREINADOR ? `<button class="btn btn-secondary btn-sm" onclick="alterarColetiva('${campoAdv}', 1)">+</button>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

async function alterarColetiva(campo, delta) {
    const valorAtual = COLETIVAS_JOGO_ATUAL[campo] || 0;
    const novoValor = Math.max(0, valorAtual + delta);
    COLETIVAS_JOGO_ATUAL[campo] = novoValor;
    desenharColetivas();
    const { error } = await supabase.from('jogo_estatisticas_coletivas').upsert(
        { jogo_id: JOGO_ATUAL.id, [campo]: novoValor },
        { onConflict: 'jogo_id' }
    );
    if (error) mostrarToast('Erro: ' + error.message, 'error');
}

// -------- posse de bola --------
function desenharPosse() {
    const el = document.getElementById('posseConteudo');
    if (!el) return;
    const col = COLETIVAS_JOGO_ATUAL;
    const segNos = segundosPosseAtuais(col, 'nos');
    const segAdv = segundosPosseAtuais(col, 'adversario');
    const total = segNos + segAdv;
    const pctNos = total > 0 ? Math.round((segNos / total) * 100) : 50;
    const pctAdv = 100 - pctNos;
    const podeMexer = EH_TREINADOR && (CONFIG_JOGO_ATUAL?.estado === 'a_decorrer' || CONFIG_JOGO_ATUAL?.estado === 'pausado');

    el.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:6px;">
            <span style="color:var(--club);">${pctNos}% (${formatarMMSS(segNos)})</span>
            <span style="color:var(--danger);">${pctAdv}% (${formatarMMSS(segAdv)})</span>
        </div>
        <div style="height:14px; border-radius:8px; overflow:hidden; display:flex; background:#eee; margin-bottom:14px;">
            <div style="width:${pctNos}%; background:var(--club);"></div>
            <div style="width:${pctAdv}%; background:var(--danger);"></div>
        </div>
        ${podeMexer ? `
        <div class="pill-toggle" style="width:100%; justify-content:center; display:flex;">
            <button type="button" class="${col.posse_atual === 'nos' ? 'active' : ''}" onclick="definirPosse('nos')">Bola: Nós</button>
            <button type="button" class="${!col.posse_atual ? 'active' : ''}" onclick="definirPosse(null)">Parada</button>
            <button type="button" class="${col.posse_atual === 'adversario' ? 'active' : ''}" onclick="definirPosse('adversario')">Bola: Adversário</button>
        </div>` : (!EH_TREINADOR ? '<div class="page-subtitle" style="text-align:center;">Atualiza-se automaticamente enquanto o jogo decorre.</div>' : '<div class="page-subtitle" style="text-align:center;">Só é possível ajustar a posse com o cronómetro a decorrer.</div>')}
    `;
}

async function flushPosse() {
    const col = COLETIVAS_JOGO_ATUAL;
    if (!col || !col.posse_atual || !col.posse_desde) return;
    const extra = Math.max(0, Math.floor((Date.now() - new Date(col.posse_desde).getTime()) / 1000));
    const campo = col.posse_atual === 'nos' ? 'posse_nos_segundos' : 'posse_adversario_segundos';
    const novoValor = (col[campo] || 0) + extra;
    col[campo] = novoValor;
    await supabase.from('jogo_estatisticas_coletivas').upsert({ jogo_id: JOGO_ATUAL.id, [campo]: novoValor, posse_atual: null, posse_desde: null }, { onConflict: 'jogo_id' });
    col.posse_atual = null; col.posse_desde = null;
}

async function definirPosse(lado) {
    await flushPosse();

    const cronometrado = CONFIG_JOGO_ATUAL?.tipo_tempo === 'cronometrado';
    if (cronometrado) {
        if (lado === null && CONFIG_JOGO_ATUAL.estado === 'a_decorrer') {
            // ninguém tem a bola: o relógio pára sozinho
            await pausarJogoAoVivo();
        } else if (lado !== null && CONFIG_JOGO_ATUAL.estado === 'pausado') {
            // alguém ganhou a posse: o relógio retoma sozinho
            await retomarJogoAoVivo();
        }
    }

    const agora = lado ? new Date().toISOString() : null;
    const { error } = await supabase.from('jogo_estatisticas_coletivas').upsert(
        { jogo_id: JOGO_ATUAL.id, posse_atual: lado, posse_desde: agora },
        { onConflict: 'jogo_id' }
    );
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    COLETIVAS_JOGO_ATUAL.posse_atual = lado;
    COLETIVAS_JOGO_ATUAL.posse_desde = agora;
    desenharPosse();
}
