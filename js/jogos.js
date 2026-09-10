// ============================================================
// JOGOS E COMPETIÇÕES — jogos.js
// EH_TREINADOR e (para jogadores) MEU_ATLETA_ID devem já estar definidas.
// ============================================================

let JOGO_ATUAL = null;
let COMPETICOES_CACHE = [];
let ATLETA_STATS_ATUAL = null;

const TATICAS = ['1x2x1', '2x2', '4x0'];

const CAMPOS_STATS = [
    ['minutos_jogados', 'Minutos jogados'],
    ['golos_marcados', 'Golos marcados'],
    ['assistencias', 'Assistências'],
    ['passes', 'Passes'],
    ['passes_chave', 'Passes-chave'],
    ['remates', 'Remates'],
    ['dribles', 'Dribles'],
    ['defesas', 'Defesas'],
    ['golos_sofridos', 'Golos sofridos'],
    ['intercecoes', 'Interceções'],
    ['desarmes', 'Desarmes'],
    ['perdas_bola', 'Perdas de bola'],
    ['recuperacoes_bola', 'Recuperações de bola'],
    ['erros_originaram_golo', 'Erros que originaram golo'],
    ['grandes_oportunidades_criadas', 'Grandes oportunidades criadas'],
    ['grandes_oportunidades_falhadas', 'Grandes oportunidades falhadas'],
    ['cartoes_amarelos', 'Cartões amarelos'],
    ['cartoes_vermelhos', 'Cartões vermelhos'],
];

// ================= COMPETIÇÕES =================
async function carregarCompeticoes() {
    const { data, error } = await supabase.from('competicoes').select('*').order('epoca', { ascending: false });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    COMPETICOES_CACHE = data;
    const el = document.getElementById('listaCompeticoes');
    if (!el) return;
    if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="ico">🏆</div>Ainda não há competições criadas.</div>`; return; }
    el.innerHTML = `<table><thead><tr><th>Nome</th><th>Época</th><th>Tipo</th><th></th></tr></thead><tbody>
        ${data.map(c => `<tr><td><strong>${c.nome}</strong></td><td>${c.epoca || '—'}</td><td>${c.tipo || '—'}</td>
        <td>${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="eliminarCompeticao('${c.id}')">Eliminar</button>` : ''}</td></tr>`).join('')}
    </tbody></table>`;
}

function abrirModalNovaCompeticao() { document.getElementById('modalNovaCompeticao').classList.add('active'); }
function fecharModalNovaCompeticao() { document.getElementById('modalNovaCompeticao').classList.remove('active'); document.getElementById('formNovaCompeticao').reset(); }

async function criarCompeticao(e) {
    e.preventDefault();
    const payload = {
        nome: document.getElementById('nc_nome').value.trim(),
        epoca: document.getElementById('nc_epoca').value.trim() || null,
        tipo: document.getElementById('nc_tipo').value.trim() || null,
    };
    const { error } = await supabase.from('competicoes').insert(payload);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Competição criada.', 'success');
    fecharModalNovaCompeticao();
    carregarCompeticoes();
}
async function eliminarCompeticao(id) {
    if (!confirm('Eliminar esta competição? Os jogos associados ficam sem competição.')) return;
    const { error } = await supabase.from('competicoes').delete().eq('id', id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    carregarCompeticoes();
}

// ================= JOGOS (listagem) =================
async function carregarJogos() {
    const { data, error } = await supabase.from('jogos').select('*, competicoes(nome)').order('data', { ascending: false });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    const el = document.getElementById('listaJogos');
    if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="ico">⚽</div>Ainda não há jogos criados.</div>`; return; }
    el.innerHTML = `<table><thead><tr><th>Data</th><th>Adversário</th><th>Competição</th><th>Local</th><th>Resultado</th><th>Estado</th><th></th></tr></thead><tbody>
        ${data.map(j => `
        <tr style="cursor:pointer;" onclick="abrirJogo('${j.id}')">
            <td>${formatarData(j.data)}</td>
            <td>${j.casa_fora === 'casa' ? 'vs' : '@'} ${j.adversario}</td>
            <td>${j.competicoes?.nome || '—'}</td>
            <td>${j.local || '—'}</td>
            <td><strong>${j.golos_equipa ?? 0} - ${j.golos_adversario ?? 0}</strong></td>
            <td>${j.fechado ? '<span class="badge badge-gray">Fechado</span>' : '<span class="badge badge-green">Aberto</span>'}</td>
            <td><button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); abrirJogo('${j.id}')">Ver</button></td>
        </tr>`).join('')}
    </tbody></table>`;
}

// ================= NOVO JOGO =================
async function abrirModalNovoJogo() {
    await carregarCompeticoes();
    const sel = document.getElementById('nj_competicao');
    sel.innerHTML = `<option value="">Sem competição associada</option>` + COMPETICOES_CACHE.map(c => `<option value="${c.id}">${c.nome} (${c.epoca || ''})</option>`).join('');
    document.getElementById('modalNovoJogo').classList.add('active');
}
function fecharModalNovoJogo() { document.getElementById('modalNovoJogo').classList.remove('active'); document.getElementById('formNovoJogo').reset(); }

async function criarJogo(e) {
    e.preventDefault();
    const payload = {
        competicao_id: document.getElementById('nj_competicao').value || null,
        jornada: document.getElementById('nj_jornada').value.trim() || null,
        adversario: document.getElementById('nj_adversario').value.trim(),
        data: document.getElementById('nj_data').value || null,
        hora: document.getElementById('nj_hora').value || null,
        local: document.getElementById('nj_local').value.trim() || null,
        casa_fora: document.getElementById('nj_casa_fora').value,
        tatica: document.getElementById('nj_tatica').value || null,
    };
    const { data, error } = await supabase.from('jogos').insert(payload).select().single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Jogo criado.', 'success');
    fecharModalNovoJogo();
    await carregarJogos();
    abrirJogo(data.id);
}

// ================= DETALHE DO JOGO =================
async function abrirJogo(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-jogo-detalhe').classList.remove('hidden');

    const { data: j, error } = await supabase.from('jogos').select('*, competicoes(nome)').eq('id', id).single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    JOGO_ATUAL = j;

    document.getElementById('jogoDetalheConteudo').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
            <div>
                <div class="page-title">${j.casa_fora === 'casa' ? 'Núcleo SCP CB vs ' + j.adversario : j.adversario + ' vs Núcleo SCP CB'}</div>
                <div class="page-subtitle">${formatarData(j.data)} · ${(j.hora||'').slice(0,5)} · ${j.local || 'local não definido'} · ${j.competicoes?.nome || 'sem competição'} ${j.jornada ? '· ' + j.jornada : ''} ${j.fechado ? '· <strong>Fechado</strong>' : ''}</div>
            </div>
            <div style="font-size:28px; font-weight:800;">${j.golos_equipa ?? 0} - ${j.golos_adversario ?? 0}</div>
        </div>

        <div class="tabs" id="jogoTabs">
            <div class="tab active" data-tab="detalhes">Detalhes</div>
            <div class="tab" data-tab="estatisticas">Estatísticas</div>
            <div class="tab" data-tab="links">Links</div>
        </div>
        <div id="jogoTabContent"></div>
    `;

    document.querySelectorAll('#jogoTabs .tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('#jogoTabs .tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            renderTabJogo(t.dataset.tab);
        });
    });
    renderTabJogo('detalhes');
}

function renderTabJogo(tab) {
    const el = document.getElementById('jogoTabContent');
    const j = JOGO_ATUAL;

    if (tab === 'detalhes') {
        el.innerHTML = `
        <div class="card">
            ${EH_TREINADOR ? `
            <form id="formDetalhesJogo">
                <div class="grid grid-3">
                    <div class="field"><label>Local/Fora</label>
                        <select id="dj_casa_fora"><option value="casa" ${j.casa_fora==='casa'?'selected':''}>Casa</option><option value="fora" ${j.casa_fora==='fora'?'selected':''}>Fora</option></select>
                    </div>
                    <div class="field"><label>Tática</label>
                        <select id="dj_tatica"><option value="">—</option>${TATICAS.map(t => `<option ${j.tatica===t?'selected':''}>${t}</option>`).join('')}</select>
                    </div>
                    <div class="field"><label>Jornada</label><input type="text" id="dj_jornada" value="${j.jornada || ''}"></div>
                    <div class="field"><label>Golos — Núcleo SCP CB</label><input type="number" min="0" id="dj_golos_equipa" value="${j.golos_equipa ?? 0}"></div>
                    <div class="field"><label>Golos — ${j.adversario}</label><input type="number" min="0" id="dj_golos_adversario" value="${j.golos_adversario ?? 0}"></div>
                    <div class="field"><label>Local do jogo</label><input type="text" id="dj_local" value="${j.local || ''}"></div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button type="submit" class="btn btn-primary">Guardar</button>
                    ${!j.fechado ? `<button type="button" class="btn btn-danger" onclick="fecharJogo()">Fechar jogo</button>` : `<span class="badge badge-gray" style="align-self:center;">Jogo fechado</span>`}
                </div>
            </form>` : `
            <table>
                <tr><th>Tática utilizada</th><td>${j.tatica || '—'}</td></tr>
                <tr><th>Jornada</th><td>${j.jornada || '—'}</td></tr>
                <tr><th>Resultado</th><td>${j.golos_equipa ?? 0} - ${j.golos_adversario ?? 0}</td></tr>
            </table>`}
        </div>`;
        if (EH_TREINADOR) document.getElementById('formDetalhesJogo').addEventListener('submit', guardarDetalhesJogo);
    }

    if (tab === 'estatisticas') renderEstatisticasJogo(el);
    if (tab === 'links') renderLinksJogo(el);
}

async function guardarDetalhesJogo(e) {
    e.preventDefault();
    const payload = {
        casa_fora: document.getElementById('dj_casa_fora').value,
        tatica: document.getElementById('dj_tatica').value || null,
        jornada: document.getElementById('dj_jornada').value.trim() || null,
        golos_equipa: parseInt(document.getElementById('dj_golos_equipa').value) || 0,
        golos_adversario: parseInt(document.getElementById('dj_golos_adversario').value) || 0,
        local: document.getElementById('dj_local').value.trim() || null,
    };
    const { error } = await supabase.from('jogos').update(payload).eq('id', JOGO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Detalhes guardados.', 'success');
    abrirJogo(JOGO_ATUAL.id);
}

async function fecharJogo() {
    if (!confirm('Fechar este jogo? Deixa de poder editar estatísticas depois.')) return;
    const { error } = await supabase.from('jogos').update({ fechado: true }).eq('id', JOGO_ATUAL.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    abrirJogo(JOGO_ATUAL.id);
}

function voltarAosJogos() {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-jogos').classList.remove('hidden');
    document.querySelectorAll('#sidebar a').forEach(x => x.classList.remove('active'));
    const link = document.querySelector('#sidebar a[data-view="jogos"]');
    if (link) link.classList.add('active');
    carregarJogos();
}

// ================= ESTATÍSTICAS POR ATLETA =================
async function renderEstatisticasJogo(el) {
    const { data: atletas } = await supabase.from(EH_TREINADOR ? 'atletas' : 'plantel_publico').select('*').eq('ativo', true).order('nome');
    const { data: stats } = await supabase.from('estatisticas_jogo').select('*').eq('jogo_id', JOGO_ATUAL.id);
    const mapa = {}; (stats || []).forEach(s => mapa[s.atleta_id] = s);

    const linhas = (atletas || [])
        .filter(a => EH_TREINADOR || a.id === MEU_ATLETA_ID)
        .map(a => {
            const s = mapa[a.id];
            return `<tr>
                <td>${a.nome}</td>
                <td>${s?.minutos_jogados ?? '—'}</td>
                <td>${s?.golos_marcados ?? 0}</td>
                <td>${s?.assistencias ?? 0}</td>
                <td>${s?.classificacao_media != null ? `<span class="badge badge-blue">${s.classificacao_media}</span>` : '—'}</td>
                <td>${EH_TREINADOR ? `<button class="btn btn-secondary btn-sm" onclick="abrirModalStatsAtleta('${a.id}', '${a.nome.replace(/'/g,"\\'")}', '${a.posicao||''}')">Editar estatísticas</button>` : ''}</td>
            </tr>`;
        }).join('');

    el.innerHTML = `<div class="card">
        <table><thead><tr><th>Atleta</th><th>Min.</th><th>Golos</th><th>Assist.</th><th>Rating</th><th></th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6">Sem dados.</td></tr>'}</tbody></table>
    </div>`;
}

function abrirModalStatsAtleta(atletaId, nome, posicao) {
    if (JOGO_ATUAL.fechado) { mostrarToast('Este jogo está fechado.', 'error'); return; }
    ATLETA_STATS_ATUAL = { id: atletaId, nome, posicao };
    supabase.from('estatisticas_jogo').select('*').eq('jogo_id', JOGO_ATUAL.id).eq('atleta_id', atletaId).maybeSingle().then(({ data: s }) => {
        document.getElementById('modalStatsTitulo').textContent = 'Estatísticas — ' + nome;
        document.getElementById('modalStatsCampos').innerHTML = CAMPOS_STATS.map(([campo, label]) => `
            <div class="field"><label>${label}</label><input type="number" min="0" id="st_${campo}" value="${s ? (s[campo] ?? 0) : 0}"></div>
        `).join('');
        document.getElementById('modalStatsAtleta').classList.add('active');
    });
}
function fecharModalStatsAtleta() { document.getElementById('modalStatsAtleta').classList.remove('active'); }

async function guardarStatsAtleta() {
    const payload = { jogo_id: JOGO_ATUAL.id, atleta_id: ATLETA_STATS_ATUAL.id };
    CAMPOS_STATS.forEach(([campo]) => payload[campo] = parseInt(document.getElementById('st_' + campo).value) || 0);
    payload.classificacao_media = calcularClassificacao(payload, ATLETA_STATS_ATUAL.posicao);

    const { error } = await supabase.from('estatisticas_jogo').upsert(payload, { onConflict: 'jogo_id,atleta_id' });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Estatísticas guardadas.', 'success');
    fecharModalStatsAtleta();
    renderTabJogo('estatisticas');
}

// ================= LINKS DO JOGO =================
async function renderLinksJogo(el) {
    const { data: links } = await supabase.from('jogos_links').select('*').eq('jogo_id', JOGO_ATUAL.id);
    el.innerHTML = `
    <div class="card">
        ${EH_TREINADOR ? `
        <fieldset><legend>Adicionar link</legend>
            <div class="grid grid-2">
                <div class="field"><label>Título</label><input type="text" id="link_titulo" placeholder="ex: Vídeo do jogo"></div>
                <div class="field"><label>URL</label><input type="text" id="link_url" placeholder="https://..."></div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="adicionarLinkJogo()">Adicionar</button>
        </fieldset>` : ''}
        <div id="listaLinksJogo">
            ${(links && links.length) ? links.map(l => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--line);">
                    <a href="${l.url}" target="_blank" style="color:var(--club); font-weight:600;">🔗 ${l.titulo || l.url}</a>
                    ${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="eliminarLinkJogo('${l.id}')">Remover</button>` : ''}
                </div>`).join('') : '<div class="empty-state">Sem links associados.</div>'}
        </div>
    </div>`;
}
async function adicionarLinkJogo() {
    const titulo = document.getElementById('link_titulo').value.trim();
    const url = document.getElementById('link_url').value.trim();
    if (!url) { mostrarToast('Indica um URL.', 'error'); return; }
    const { error } = await supabase.from('jogos_links').insert({ jogo_id: JOGO_ATUAL.id, titulo: titulo || null, url });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    renderTabJogo('links');
}
async function eliminarLinkJogo(id) {
    await supabase.from('jogos_links').delete().eq('id', id);
    renderTabJogo('links');
}
