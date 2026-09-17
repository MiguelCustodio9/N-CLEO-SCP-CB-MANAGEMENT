// ============================================================
// TREINOS — treinos.js
// EH_TREINADOR deve estar definida (true/false) antes de carregar este ficheiro.
// ============================================================

let TREINO_ATUAL = null;
let TREINOS_CACHE = [];

const ESTADOS_PRESENCA = [
    ['presente', 'Presente', 'badge-green'],
    ['falta_justificada', 'Falta justificada', 'badge-orange'],
    ['falta_injustificada', 'Falta injustificada', 'badge-red'],
    ['lesionado', 'Lesionado', 'badge-blue'],
];

// ---------------- LISTAGEM ----------------
async function carregarTreinos() {
    const { data, error } = await supabase.from('treinos').select('*').order('numero', { ascending: false });
    if (error) { mostrarToast('Erro a carregar treinos: ' + error.message, 'error'); return; }
    TREINOS_CACHE = data;

    const lista = document.getElementById('listaTreinos');
    if (!data.length) {
        lista.innerHTML = `<div class="empty-state"><div class="ico">🏃</div>Ainda não há treinos criados.</div>`;
        return;
    }
    lista.innerHTML = `
    <div style="overflow-x:auto;">
    <table>
        <thead><tr><th>Nº</th><th>Dia</th><th>Horário</th><th>Local</th><th>Estado</th><th></th></tr></thead>
        <tbody>
        ${data.map(t => `
            <tr style="cursor:pointer;" onclick="abrirTreino('${t.id}')">
                <td><strong>#${t.numero}</strong></td>
                <td>${formatarData(t.dia)}</td>
                <td>${(t.hora_inicio || '').slice(0,5)} - ${(t.hora_fim || '').slice(0,5)}</td>
                <td>${t.local || '—'}</td>
                <td>${t.fechado ? '<span class="badge badge-gray">Fechado</span>' : '<span class="badge badge-green">Aberto</span>'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); abrirTreino('${t.id}')">Ver</button>
                    ${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); eliminarTreino('${t.id}')">Eliminar</button>` : ''}
                </td>
            </tr>
        `).join('')}
        </tbody>
    </table>
    </div>`;
}

function formatarData(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}

// ---------------- CRIAR TREINO (treinador) ----------------
function abrirModalNovoTreino() {
    document.getElementById('modalNovoTreino').classList.add('active');
    document.getElementById('nt_dia').value = new Date().toISOString().slice(0, 10);
}
function fecharModalNovoTreino() {
    document.getElementById('modalNovoTreino').classList.remove('active');
    document.getElementById('formNovoTreino').reset();
}

async function criarTreino(e) {
    e.preventDefault();
    const ultimoNumero = TREINOS_CACHE.length ? Math.max(...TREINOS_CACHE.map(t => t.numero)) : 0;
    const payload = {
        numero: ultimoNumero + 1,
        dia: document.getElementById('nt_dia').value,
        hora_inicio: document.getElementById('nt_hora_inicio').value || null,
        hora_fim: document.getElementById('nt_hora_fim').value || null,
        local: document.getElementById('nt_local').value.trim() || null,
    };
    const { data, error } = await supabase.from('treinos').insert(payload).select().single();
    if (error) { mostrarToast('Erro ao criar treino: ' + error.message, 'error'); return; }
    mostrarToast('Treino #' + data.numero + ' criado.', 'success');
    fecharModalNovoTreino();
    await carregarTreinos();
    abrirTreino(data.id);
}

// ---------------- DETALHE DO TREINO ----------------
async function abrirTreino(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-treino-detalhe').classList.remove('hidden');

    const { data: t, error } = await supabase.from('treinos').select('*').eq('id', id).single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    TREINO_ATUAL = t;

    const { data: atletas } = await supabase.from(EH_TREINADOR ? 'atletas' : 'plantel_publico').select('*').eq('ativo', true).order('nome');
    const { data: presencas } = await supabase.from('presencas_treino').select('*').eq('treino_id', id);
    const { data: esforcos } = await supabase.from('avaliacoes_esforco').select('*').eq('treino_id', id);

    const mapaPresencas = {}; (presencas || []).forEach(p => mapaPresencas[p.atleta_id] = p.estado);
    const mapaEsforco = {}; (esforcos || []).forEach(a => mapaEsforco[a.atleta_id] = a.valor);

    let acoesHtml = '';
    if (EH_TREINADOR) {
        acoesHtml = `
            <button class="btn btn-secondary btn-sm" onclick="descarregarPresencasPDF()">📄 Presenças (PDF)</button>
            <button class="btn btn-secondary btn-sm" onclick="descarregarEsforcoPDF()">📄 Esforço (PDF)</button>
            ${!t.fechado ? `<button class="btn btn-danger btn-sm" onclick="fecharTreino()">Fechar treino</button>` : `<span class="badge badge-gray">Treino fechado</span>`}
            <button class="btn btn-danger btn-sm" onclick="eliminarTreino('${t.id}')">Eliminar treino</button>
        `;
    }

    const souGR = !EH_TREINADOR && typeof MEU_POSICAO !== 'undefined' && MEU_POSICAO === 'Guarda-Redes';

    document.getElementById('treinoDetalheConteudo').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
            <div>
                <div class="page-title">Treino #${t.numero}</div>
                <div class="page-subtitle">${formatarData(t.dia)} · ${(t.hora_inicio||'').slice(0,5)}-${(t.hora_fim||'').slice(0,5)} · ${t.local || 'local não definido'} ${t.fechado ? '· <strong>Fechado</strong>' : ''}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">${acoesHtml}</div>
        </div>

        <div class="card">
            <fieldset><legend>Plano de treino</legend>
                ${t.plano_treino_url ? `<a href="${t.plano_treino_url}" target="_blank" class="btn btn-secondary btn-sm">⬇️ Transferir plano de treino</a>` : `<div class="page-subtitle" style="margin-bottom:8px;">Ainda não há plano de treino carregado.</div>`}
                ${EH_TREINADOR && !t.fechado ? `
                <div style="margin-top:12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <input type="file" id="ficheiroPlano">
                    <button class="btn btn-primary btn-sm" onclick="carregarPlanoTreino()">Carregar ficheiro</button>
                </div>` : ''}
            </fieldset>
        </div>

        ${(EH_TREINADOR || souGR) ? `
        <div class="card">
            <fieldset><legend>Plano de treino — Guarda-Redes <span class="badge badge-blue">só visível às guarda-redes</span></legend>
                ${t.plano_treino_gr_url ? `<a href="${t.plano_treino_gr_url}" target="_blank" class="btn btn-secondary btn-sm">⬇️ Transferir plano de GR</a>` : `<div class="page-subtitle" style="margin-bottom:8px;">Ainda não há plano específico de guarda-redes.</div>`}
                ${EH_TREINADOR && !t.fechado ? `
                <div style="margin-top:12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <input type="file" id="ficheiroPlanoGR">
                    <button class="btn btn-primary btn-sm" onclick="carregarPlanoTreinoGR()">Carregar ficheiro</button>
                </div>` : ''}
            </fieldset>
        </div>` : ''}

        <div class="card">
            <fieldset><legend>Folha de presenças</legend>
                <table id="tabelaPresencas">
                    <thead><tr><th>Atleta</th><th>Estado</th></tr></thead>
                    <tbody>
                    ${(atletas || []).map(a => `
                        <tr>
                            <td>${a.nome}</td>
                            <td>
                                ${EH_TREINADOR && !t.fechado ? `
                                <select onchange="guardarPresenca('${a.id}', this.value)">
                                    <option value="">—</option>
                                    ${ESTADOS_PRESENCA.map(([v,l]) => `<option value="${v}" ${mapaPresencas[a.id]===v?'selected':''}>${l}</option>`).join('')}
                                </select>` :
                                (mapaPresencas[a.id] ? `<span class="badge ${ESTADOS_PRESENCA.find(e=>e[0]===mapaPresencas[a.id])[2]}">${ESTADOS_PRESENCA.find(e=>e[0]===mapaPresencas[a.id])[1]}</span>` : '<span class="badge badge-gray">Por marcar</span>')}
                            </td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
            </fieldset>
        </div>

        <div class="card">
            <fieldset><legend>Avaliação de esforço (1 a 5)</legend>
                <table id="tabelaEsforco">
                    <thead><tr><th>Atleta</th><th>Esforço</th></tr></thead>
                    <tbody>
                    ${(atletas || []).map(a => `
                        <tr>
                            <td>${a.nome}</td>
                            <td>${renderInputEsforco(a.id, mapaEsforco[a.id], t.fechado)}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
            </fieldset>
        </div>
    `;
}

function renderInputEsforco(atletaId, valorAtual, fechado) {
    const podeEditar = !fechado && (EH_TREINADOR || (typeof MEU_ATLETA_ID !== 'undefined' && MEU_ATLETA_ID === atletaId));
    if (!podeEditar) {
        return valorAtual ? `<span class="badge badge-blue">${valorAtual}/5</span>` : '<span class="badge badge-gray">Sem resposta</span>';
    }
    return `<div class="pill-toggle">${[1,2,3,4,5].map(v => `<button type="button" class="${valorAtual==v?'active':''}" onclick="guardarEsforco('${atletaId}', ${v})">${v}</button>`).join('')}</div>`;
}

async function guardarPresenca(atletaId, estado) {
    if (!estado) return;
    const { error } = await supabase.from('presencas_treino').upsert(
        { treino_id: TREINO_ATUAL.id, atleta_id: atletaId, estado },
        { onConflict: 'treino_id,atleta_id' }
    );
    if (error) mostrarToast('Erro: ' + error.message, 'error');
    else mostrarToast('Presença guardada.', 'success');
}

async function guardarEsforco(atletaId, valor) {
    const { error } = await supabase.from('avaliacoes_esforco').upsert(
        { treino_id: TREINO_ATUAL.id, atleta_id: atletaId, valor },
        { onConflict: 'treino_id,atleta_id' }
    );
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Esforço registado.', 'success');
    abrirTreino(TREINO_ATUAL.id);
}

async function carregarPlanoTreino() {
    const input = document.getElementById('ficheiroPlano');
    const ficheiro = input.files[0];
    if (!ficheiro) { mostrarToast('Escolhe um ficheiro primeiro.', 'error'); return; }
    const caminho = `treino-${TREINO_ATUAL.numero}-${Date.now()}-${ficheiro.name}`;
    const { error: erroUpload } = await supabase.storage.from('planos-treino').upload(caminho, ficheiro, { upsert: true });
    if (erroUpload) { mostrarToast('Erro ao carregar: ' + erroUpload.message, 'error'); return; }
    const { data: urlPublico } = supabase.storage.from('planos-treino').getPublicUrl(caminho);
    const { error } = await supabase.from('treinos').update({ plano_treino_url: urlPublico.publicUrl }).eq('id', TREINO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Plano de treino carregado.', 'success');
    abrirTreino(TREINO_ATUAL.id);
}

async function carregarPlanoTreinoGR() {
    const input = document.getElementById('ficheiroPlanoGR');
    const ficheiro = input.files[0];
    if (!ficheiro) { mostrarToast('Escolhe um ficheiro primeiro.', 'error'); return; }
    const caminho = `treino-${TREINO_ATUAL.numero}-gr-${Date.now()}-${ficheiro.name}`;
    const { error: erroUpload } = await supabase.storage.from('planos-treino').upload(caminho, ficheiro, { upsert: true });
    if (erroUpload) { mostrarToast('Erro ao carregar: ' + erroUpload.message, 'error'); return; }
    const { data: urlPublico } = supabase.storage.from('planos-treino').getPublicUrl(caminho);
    const { error } = await supabase.from('treinos').update({ plano_treino_gr_url: urlPublico.publicUrl }).eq('id', TREINO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Plano de guarda-redes carregado.', 'success');
    abrirTreino(TREINO_ATUAL.id);
}

async function fecharTreino() {
    if (!confirm('Fechar este treino? Depois de fechado, presenças e esforço deixam de poder ser alterados.')) return;
    const { error } = await supabase.from('treinos').update({ fechado: true }).eq('id', TREINO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Treino fechado.', 'success');
    abrirTreino(TREINO_ATUAL.id);
}

async function eliminarTreino(id) {
    if (!confirm('Eliminar este treino e todas as presenças/avaliações associadas? Esta ação não pode ser revertida.')) return;
    const { error } = await supabase.from('treinos').delete().eq('id', id);
    if (error) { mostrarToast('Erro ao eliminar: ' + error.message, 'error'); return; }
    mostrarToast('Treino eliminado.', 'success');
    voltarAosTreinos();
}

function voltarAosTreinos() {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-treinos').classList.remove('hidden');
    document.querySelectorAll('#sidebar a').forEach(x => x.classList.remove('active'));
    const linkTreinos = document.querySelector('#sidebar a[data-view="treinos"]');
    if (linkTreinos) linkTreinos.classList.add('active');
    carregarTreinos();
}

// ---------------- PDFs ----------------
async function descarregarPresencasPDF() {
    const t = TREINO_ATUAL;
    const { data: atletas } = await supabase.from('atletas').select('id,nome').order('nome');
    const { data: presencas } = await supabase.from('presencas_treino').select('*').eq('treino_id', t.id);
    const mapa = {}; (presencas || []).forEach(p => mapa[p.atleta_id] = p.estado);
    const labelDe = v => (ESTADOS_PRESENCA.find(e => e[0] === v) || [,'Por marcar'])[1];

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = await desenharCabecalhoPDF(doc, 'Folha de Presenças', `Treino #${t.numero}`);
    doc.setFontSize(10); doc.setTextColor(...COR_CINZA_PDF);
    doc.text(`${formatarData(t.dia)}  ·  ${(t.hora_inicio||'').slice(0,5)}-${(t.hora_fim||'').slice(0,5)}  ·  ${t.local || ''}`, 14, y);
    y += 8;

    doc.autoTable(Object.assign(estiloTabelaPDF(y), {
        head: [['Atleta', 'Estado']],
        body: (atletas || []).map(a => [a.nome, labelDe(mapa[a.id])]),
    }));

    desenharRodapePDF(doc);
    doc.save(`Presencas_Treino_${t.numero}.pdf`);
}

async function descarregarEsforcoPDF() {
    const t = TREINO_ATUAL;
    const { data: atletas } = await supabase.from('atletas').select('id,nome').order('nome');
    const { data: esforcos } = await supabase.from('avaliacoes_esforco').select('*').eq('treino_id', t.id);
    const mapa = {}; (esforcos || []).forEach(a => mapa[a.atleta_id] = a.valor);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = await desenharCabecalhoPDF(doc, 'Avaliação de Esforço', `Treino #${t.numero}`);
    doc.setFontSize(10); doc.setTextColor(...COR_CINZA_PDF);
    doc.text(formatarData(t.dia), 14, y);
    y += 8;

    doc.autoTable(Object.assign(estiloTabelaPDF(y), {
        head: [['Atleta', 'Esforço (1-5)']],
        body: (atletas || []).map(a => [a.nome, mapa[a.id] ? String(mapa[a.id]) : '—']),
    }));

    desenharRodapePDF(doc);
    doc.save(`Esforco_Treino_${t.numero}.pdf`);
}
