// ============================================================
// JOGOS E COMPETIÇÕES — jogos.js
// EH_TREINADOR e (para jogadores) MEU_ATLETA_ID devem já estar definidas.
// ============================================================

let JOGO_ATUAL = null;
let COMPETICAO_ATUAL = null;
let COMPETICOES_CACHE = [];
let ATLETA_STATS_ATUAL = null;
let CANAL_REALTIME_JOGO = null;

const TATICAS = ['1x2x1', '2x2', '4x0'];

// posições no "relvado" para cada tática: [rótulo, x%, y%]
const FORMACOES_SLOTS = {
    '1x2x1': [['Guarda-Redes', 50, 90], ['Fixo', 50, 63], ['Ala Esquerdo', 22, 38], ['Ala Direito', 78, 38], ['Pivot', 50, 14]],
    '2x2': [['Guarda-Redes', 50, 90], ['Defesa Esq.', 30, 62], ['Defesa Dir.', 70, 62], ['Ataque Esq.', 30, 26], ['Ataque Dir.', 70, 26]],
    '4x0': [['Guarda-Redes', 50, 90], ['Jogadora 1', 20, 55], ['Jogadora 2', 40, 42], ['Jogadora 3', 60, 42], ['Jogadora 4', 80, 55]],
};

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
    el.innerHTML = `<table><thead><tr><th>Nome</th><th>Época</th><th>Formato</th><th></th></tr></thead><tbody>
        ${data.map(c => `<tr style="cursor:pointer;" onclick="abrirCompeticao('${c.id}')">
            <td><strong>${c.nome}</strong></td><td>${c.epoca || '—'}</td>
            <td><span class="badge ${c.formato === 'taca' ? 'badge-orange' : 'badge-blue'}">${c.formato === 'taca' ? 'Taça' : 'Liga'}</span></td>
            <td>${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); eliminarCompeticao('${c.id}')">Eliminar</button>` : ''}</td>
        </tr>`).join('')}
    </tbody></table>`;
}

function abrirModalNovaCompeticao() {
    document.getElementById('modalNovaCompeticao').classList.add('active');
    document.getElementById('nc_formato').onchange = () => {
        document.getElementById('nc_fases_bloco').classList.toggle('hidden', document.getElementById('nc_formato').value !== 'taca');
    };
}
function fecharModalNovaCompeticao() { document.getElementById('modalNovaCompeticao').classList.remove('active'); document.getElementById('formNovaCompeticao').reset(); document.getElementById('nc_fases_bloco').classList.add('hidden'); }

function adicionarLinhaFaseInicial() {
    const div = document.createElement('div');
    div.className = 'grid grid-2';
    div.style = 'margin-bottom:8px;';
    div.innerHTML = `<input type="text" class="nc_fase_nome" placeholder="ex: Fase de Grupos">`;
    document.getElementById('nc_fases_lista').appendChild(div);
}

async function criarCompeticao(e) {
    e.preventDefault();
    const formato = document.getElementById('nc_formato').value;
    const payload = {
        nome: document.getElementById('nc_nome').value.trim(),
        epoca: document.getElementById('nc_epoca').value.trim() || null,
        tipo: document.getElementById('nc_tipo').value.trim() || null,
        formato,
    };
    const { data: nova, error } = await supabase.from('competicoes').insert(payload).select().single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }

    if (formato === 'taca') {
        const nomes = [...document.querySelectorAll('.nc_fase_nome')].map(i => i.value.trim()).filter(Boolean);
        for (let i = 0; i < nomes.length; i++) {
            await supabase.from('competicao_fases').insert({ competicao_id: nova.id, ordem: i + 1, nome: nomes[i] });
        }
    }

    mostrarToast('Competição criada.', 'success');
    fecharModalNovaCompeticao();
    carregarCompeticoes();
}

async function eliminarCompeticao(id) {
    if (!confirm('Eliminar esta competição? TODOS os jogos associados a ela também vão ser eliminados. Esta ação não pode ser revertida.')) return;
    const { error } = await supabase.from('competicoes').delete().eq('id', id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Competição eliminada.', 'success');
    carregarCompeticoes();
}

// -------- detalhe da competição (fases da taça / classificação da liga) --------
async function abrirCompeticao(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-competicao-detalhe').classList.remove('hidden');

    const { data: c, error } = await supabase.from('competicoes').select('*').eq('id', id).single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    COMPETICAO_ATUAL = c;

    const { data: jogos } = await supabase.from('jogos').select('*').eq('competicao_id', id).order('data');

    let corpo = '';
    if (c.formato === 'taca') {
        const { data: fases } = await supabase.from('competicao_fases').select('*').eq('competicao_id', id).order('ordem');
        corpo = `
        <div class="card">
            <fieldset><legend>Fases da competição</legend>
                ${EH_TREINADOR ? `
                <div style="display:flex; gap:10px; align-items:flex-end; margin-bottom:14px; flex-wrap:wrap;">
                    <div class="field" style="margin-bottom:0;"><label>Nome da nova fase</label><input type="text" id="nova_fase_nome" placeholder="ex: Quartos de Final"></div>
                    <button class="btn btn-primary btn-sm" onclick="adicionarFase()">+ Adicionar fase</button>
                </div>` : ''}
                ${(fases && fases.length) ? `<table><thead><tr><th>#</th><th>Fase</th><th>Jogos</th><th></th></tr></thead><tbody>
                    ${fases.map(f => `<tr>
                        <td>${f.ordem}</td><td><strong>${f.nome}</strong></td>
                        <td>${(jogos || []).filter(j => j.fase_id === f.id).length}</td>
                        <td>${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="eliminarFase('${f.id}')">Remover</button>` : ''}</td>
                    </tr>`).join('')}
                </tbody></table>` : '<div class="empty-state">Ainda sem fases definidas.</div>'}
            </fieldset>
        </div>`;
    } else {
        const fechados = (jogos || []).filter(j => j.fechado);
        let v=0,e=0,d=0,gm=0,gs=0;
        fechados.forEach(j => { gm+=j.golos_equipa||0; gs+=j.golos_adversario||0; if(j.golos_equipa>j.golos_adversario)v++; else if(j.golos_equipa===j.golos_adversario)e++; else d++; });
        const pts = v*3+e;
        corpo = `
        <div class="card">
            <fieldset><legend>Classificação — registo do Núcleo SCP CB nesta competição</legend>
                <div class="page-subtitle" style="margin-bottom:12px;">Mostra só o percurso da nossa equipa (não temos dados dos jogos entre os outros clubes da competição, por isso não é possível montar a tabela completa da liga).</div>
                <table><thead><tr><th>J</th><th>V</th><th>E</th><th>D</th><th>GM</th><th>GS</th><th>DG</th><th>Pts</th></tr></thead>
                <tbody><tr><td>${fechados.length}</td><td>${v}</td><td>${e}</td><td>${d}</td><td>${gm}</td><td>${gs}</td><td>${gm-gs}</td><td><strong>${pts}</strong></td></tr></tbody></table>
            </fieldset>
        </div>`;
    }

    document.getElementById('competicaoDetalheConteudo').innerHTML = `
        <div class="page-title">${c.nome}</div>
        <div class="page-subtitle">${c.epoca || ''} ${c.tipo ? '· ' + c.tipo : ''} · ${c.formato === 'taca' ? 'Formato de taça' : 'Formato de liga'}</div>
        ${corpo}
        <div class="card"><fieldset><legend>Jogos desta competição</legend>
            ${(jogos && jogos.length) ? `<table><thead><tr><th>Data</th><th>Adversário</th><th>Resultado</th></tr></thead><tbody>
                ${jogos.map(j => `<tr style="cursor:pointer;" onclick="abrirJogo('${j.id}')"><td>${formatarData(j.data)}</td><td>${j.adversario || ''}</td><td>${j.golos_equipa ?? 0} - ${j.golos_adversario ?? 0}</td></tr>`).join('')}
            </tbody></table>` : '<div class="empty-state">Ainda sem jogos.</div>'}
        </fieldset></div>
    `;
}

async function adicionarFase() {
    const nome = document.getElementById('nova_fase_nome').value.trim();
    if (!nome) return;
    const { data: existentes } = await supabase.from('competicao_fases').select('ordem').eq('competicao_id', COMPETICAO_ATUAL.id).order('ordem', { ascending: false }).limit(1);
    const proximaOrdem = existentes && existentes.length ? existentes[0].ordem + 1 : 1;
    const { error } = await supabase.from('competicao_fases').insert({ competicao_id: COMPETICAO_ATUAL.id, ordem: proximaOrdem, nome });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    abrirCompeticao(COMPETICAO_ATUAL.id);
}
async function eliminarFase(id) {
    if (!confirm('Remover esta fase? Os jogos que lá estavam ficam sem fase atribuída.')) return;
    await supabase.from('competicao_fases').delete().eq('id', id);
    abrirCompeticao(COMPETICAO_ATUAL.id);
}
function voltarAsCompeticoes() {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-competicoes').classList.remove('hidden');
    document.querySelectorAll('#sidebar a').forEach(x => x.classList.remove('active'));
    const link = document.querySelector('#sidebar a[data-view="competicoes"]');
    if (link) link.classList.add('active');
    carregarCompeticoes();
}

// ================= JOGOS (listagem) =================
async function carregarJogos() {
    const { data, error } = await supabase.from('jogos').select('*, competicoes(nome), equipas_adversarias(nome, logo_url)').order('data', { ascending: false });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    const el = document.getElementById('listaJogos');
    if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="ico">⚽</div>Ainda não há jogos criados.</div>`; return; }
    el.innerHTML = `<table><thead><tr><th></th><th>Data</th><th>Adversário</th><th>Competição</th><th>Local</th><th>Resultado</th><th>Estado</th><th></th></tr></thead><tbody>
        ${data.map(j => {
            const nomeAdv = j.equipas_adversarias?.nome || j.adversario || '—';
            return `<tr style="cursor:pointer;" onclick="abrirJogo('${j.id}')">
            <td><img src="${j.equipas_adversarias?.logo_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent(nomeAdv)}" style="width:26px;height:26px;border-radius:6px;object-fit:contain;"></td>
            <td>${formatarData(j.data)}</td>
            <td>${j.casa_fora === 'casa' ? 'vs' : '@'} ${nomeAdv}</td>
            <td>${j.competicoes?.nome || '—'}</td>
            <td>${j.local || '—'}</td>
            <td><strong>${j.golos_equipa ?? 0} - ${j.golos_adversario ?? 0}</strong></td>
            <td>${j.fechado ? '<span class="badge badge-gray">Fechado</span>' : '<span class="badge badge-green">Aberto</span>'}</td>
            <td>${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); eliminarJogo('${j.id}')">Eliminar</button>` : ''}</td>
        </tr>`; }).join('')}
    </tbody></table>`;
}

// ================= NOVO JOGO =================
async function abrirModalNovoJogo() {
    await carregarCompeticoes();
    const selComp = document.getElementById('nj_competicao');
    selComp.innerHTML = `<option value="">Sem competição associada</option>` + COMPETICOES_CACHE.map(c => `<option value="${c.id}" data-formato="${c.formato}">${c.nome} (${c.epoca || ''})</option>`).join('');
    await popularSelectEquipas(document.getElementById('nj_adversario_id'));
    atualizarBlocoFaseNovoJogo();
    selComp.onchange = atualizarBlocoFaseNovoJogo;
    document.getElementById('nj_adversario_id').onchange = (e) => {
        if (e.target.value === '__nova__') { e.target.value = ''; abrirModalNovaEquipa(); }
    };
    document.getElementById('modalNovoJogo').classList.add('active');
}
async function atualizarBlocoFaseNovoJogo() {
    const selComp = document.getElementById('nj_competicao');
    const opt = selComp.selectedOptions[0];
    const bloco = document.getElementById('nj_fase_bloco');
    if (opt && opt.dataset.formato === 'taca' && selComp.value) {
        const { data: fases } = await supabase.from('competicao_fases').select('*').eq('competicao_id', selComp.value).order('ordem');
        document.getElementById('nj_fase').innerHTML = `<option value="">—</option>` + (fases || []).map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        bloco.classList.remove('hidden');
    } else {
        bloco.classList.add('hidden');
    }
}
function fecharModalNovoJogo() { document.getElementById('modalNovoJogo').classList.remove('active'); document.getElementById('formNovoJogo').reset(); }

async function criarJogo(e) {
    e.preventDefault();
    const adversarioId = document.getElementById('nj_adversario_id').value || null;
    let nomeAdversario = null;
    if (adversarioId) { const eq = EQUIPAS_CACHE.find(x => x.id === adversarioId); nomeAdversario = eq ? eq.nome : null; }

    const payload = {
        competicao_id: document.getElementById('nj_competicao').value || null,
        fase_id: document.getElementById('nj_fase') && !document.getElementById('nj_fase_bloco').classList.contains('hidden') ? (document.getElementById('nj_fase').value || null) : null,
        jornada: document.getElementById('nj_jornada').value.trim() || null,
        adversario_id: adversarioId,
        adversario: nomeAdversario,
        data: document.getElementById('nj_data').value || null,
        hora: document.getElementById('nj_hora').value || null,
        local: document.getElementById('nj_local').value.trim() || null,
        casa_fora: document.getElementById('nj_casa_fora').value,
        tatica: document.getElementById('nj_tatica').value || null,
    };
    if (!adversarioId) { mostrarToast('Escolhe a equipa adversária.', 'error'); return; }

    const { data, error } = await supabase.from('jogos').insert(payload).select().single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Jogo criado.', 'success');
    fecharModalNovoJogo();
    await carregarJogos();
    abrirJogo(data.id);
}

async function eliminarJogo(id) {
    if (!confirm('Eliminar este jogo e todas as suas estatísticas? Esta ação não pode ser revertida.')) return;
    const { error } = await supabase.from('jogos').delete().eq('id', id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Jogo eliminado.', 'success');
    carregarJogos();
}

// ================= DETALHE DO JOGO =================
async function abrirJogo(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-jogo-detalhe').classList.remove('hidden');

    const { data: j, error } = await supabase.from('jogos').select('*, competicoes(nome), competicao_fases(nome), equipas_adversarias(nome, logo_url)').eq('id', id).single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    JOGO_ATUAL = j;

    const nomeAdv = j.equipas_adversarias?.nome || j.adversario || 'Adversário';

    document.getElementById('jogoDetalheConteudo').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
            <div style="display:flex; gap:14px; align-items:center;">
                ${j.equipas_adversarias?.logo_url ? `<img src="${j.equipas_adversarias.logo_url}" style="width:44px;height:44px;object-fit:contain;border-radius:8px;">` : ''}
                <div>
                    <div class="page-title">${j.casa_fora === 'casa' ? 'Núcleo SCP CB vs ' + nomeAdv : nomeAdv + ' vs Núcleo SCP CB'}</div>
                    <div class="page-subtitle">${formatarData(j.data)} · ${(j.hora||'').slice(0,5)} · ${j.local || 'local não definido'} · ${j.competicoes?.nome || 'sem competição'} ${j.competicao_fases?.nome ? '· ' + j.competicao_fases.nome : ''} ${j.jornada ? '· ' + j.jornada : ''} ${j.fechado ? '· <strong>Fechado</strong>' : '· <span class="badge badge-green">Ao vivo/aberto</span>'}</div>
                </div>
            </div>
            <div style="font-size:28px; font-weight:800;" id="placarJogo">${j.golos_equipa ?? 0} - ${j.golos_adversario ?? 0}</div>
        </div>

        <div class="tabs" id="jogoTabs">
            <div class="tab active" data-tab="detalhes">Detalhes</div>
            <div class="tab" data-tab="aovivo">Ao Vivo ${!j.fechado ? '🔴' : ''}</div>
            <div class="tab" data-tab="convocatoria">Convocatória</div>
            <div class="tab" data-tab="estatisticas">Estatísticas ${!j.fechado ? '🔴' : ''}</div>
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
    ligarRealtimeJogo(id);
}

// -------- estatísticas em tempo real --------
function ligarRealtimeJogo(jogoId) {
    desligarRealtimeJogo();
    CANAL_REALTIME_JOGO = supabase.channel('jogo-' + jogoId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'estatisticas_jogo', filter: `jogo_id=eq.${jogoId}` }, () => {
            const abaAtiva = document.querySelector('#jogoTabs .tab.active');
            if (abaAtiva && abaAtiva.dataset.tab === 'estatisticas') renderTabJogo('estatisticas');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jogo_participantes', filter: `jogo_id=eq.${jogoId}` }, () => {
            const abaAtiva = document.querySelector('#jogoTabs .tab.active');
            if (abaAtiva && abaAtiva.dataset.tab === 'convocatoria') renderTabJogo('convocatoria');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jogo_substituicoes', filter: `jogo_id=eq.${jogoId}` }, () => {
            const abaAtiva = document.querySelector('#jogoTabs .tab.active');
            if (abaAtiva && abaAtiva.dataset.tab === 'convocatoria') renderTabJogo('convocatoria');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jogo_configuracao', filter: `jogo_id=eq.${jogoId}` }, (payload) => {
            if (payload.new) CONFIG_JOGO_ATUAL = payload.new;
            const abaAtiva = document.querySelector('#jogoTabs .tab.active');
            if (abaAtiva && abaAtiva.dataset.tab === 'aovivo') desenharCronometro();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jogo_estatisticas_coletivas', filter: `jogo_id=eq.${jogoId}` }, (payload) => {
            if (payload.new) COLETIVAS_JOGO_ATUAL = payload.new;
            const abaAtiva = document.querySelector('#jogoTabs .tab.active');
            if (abaAtiva && abaAtiva.dataset.tab === 'aovivo') { desenharColetivas(); desenharPosse(); }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jogos', filter: `id=eq.${jogoId}` }, (payload) => {
            const placar = document.getElementById('placarJogo');
            if (placar) placar.textContent = `${payload.new.golos_equipa ?? 0} - ${payload.new.golos_adversario ?? 0}`;
        })
        .subscribe();
}
function desligarRealtimeJogo() {
    if (CANAL_REALTIME_JOGO) { supabase.removeChannel(CANAL_REALTIME_JOGO); CANAL_REALTIME_JOGO = null; }
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
                    <div class="field"><label>Golos — ${j.equipas_adversarias?.nome || j.adversario || 'adversário'}</label><input type="number" min="0" id="dj_golos_adversario" value="${j.golos_adversario ?? 0}"></div>
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

    if (tab === 'aovivo') renderAoVivo(el);
    if (tab === 'convocatoria') renderConvocatoria(el);
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
    desligarRealtimeJogo();
    pararIntervaloCronometro();
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-jogos').classList.remove('hidden');
    document.querySelectorAll('#sidebar a').forEach(x => x.classList.remove('active'));
    const link = document.querySelector('#sidebar a[data-view="jogos"]');
    if (link) link.classList.add('active');
    carregarJogos();
}

// ================= CONVOCATÓRIA (convocados, titulares, suplentes) =================
async function renderConvocatoria(el) {
    const { data: atletas } = await supabase.from(EH_TREINADOR ? 'atletas' : 'plantel_publico').select('*').eq('ativo', true).order('nome');
    const { data: participantes } = await supabase.from('jogo_participantes').select('*').eq('jogo_id', JOGO_ATUAL.id);
    const { data: substituicoes } = await supabase.from('jogo_substituicoes').select('*, sai:atleta_sai_id(nome), entra:atleta_entra_id(nome)').eq('jogo_id', JOGO_ATUAL.id).order('minuto');

    const mapa = {}; (participantes || []).forEach(p => mapa[p.atleta_id] = p);
    const slots = FORMACOES_SLOTS[JOGO_ATUAL.tatica] || null;

    const titulares = (atletas || []).filter(a => mapa[a.id]?.tipo === 'titular');
    const suplentes = (atletas || []).filter(a => mapa[a.id]?.tipo === 'suplente');
    const suplentesUsados = (atletas || []).filter(a => mapa[a.id]?.tipo === 'suplente_utilizado');
    const convocadosSoltos = (atletas || []).filter(a => mapa[a.id]?.tipo === 'convocado');
    const naoConvocados = (atletas || []).filter(a => !mapa[a.id]);

    let html = '';

    if (!JOGO_ATUAL.tatica) {
        html += `<div class="card"><div class="empty-state">Define primeiro a tática no separador "Detalhes" para poderes montar o onze inicial no relvado.</div></div>`;
    }

    html += `<div class="card">
        <fieldset><legend>Onze inicial${JOGO_ATUAL.tatica ? ' — ' + JOGO_ATUAL.tatica : ''}</legend>
        <div class="grid grid-2" style="align-items:flex-start;">
            <div class="tactic-pitch">
                ${slots ? slots.map(([label, x, y], i) => {
                    const atualId = Object.keys(mapa).find(id => mapa[id].tipo === 'titular' && mapa[id].posicao_tatica === label);
                    return `<div class="tactic-slot" style="left:${x}%; top:${y}%;">
                        <div class="tactic-slot-label">${label}</div>
                        ${EH_TREINADOR ? `<select onchange="atribuirPosicaoTatica('${label}', this.value)">
                            <option value="">—</option>
                            ${titulares.map(a => `<option value="${a.id}" ${atualId === a.id ? 'selected' : ''}>${a.nome.split(' ')[0]}</option>`).join('')}
                        </select>` : `<div class="tactic-slot-nome">${atualId ? atletas.find(a => a.id === atualId)?.nome.split(' ')[0] : '—'}</div>`}
                    </div>`;
                }).join('') : ''}
            </div>
            <div>
                <div class="page-subtitle" style="margin-bottom:8px;">Titulares (${titulares.length})</div>
                ${titulares.length ? titulares.map(a => `<div class="badge badge-green" style="margin:2px;">${a.nome}${mapa[a.id].posicao_tatica ? ' · ' + mapa[a.id].posicao_tatica : ''}</div>`).join('') : '<div class="empty-state" style="padding:10px;">Ainda sem titulares definidos.</div>'}
            </div>
        </div>
        </fieldset>
    </div>

    <div class="card">
        <fieldset><legend>Banco (${suplentes.length + suplentesUsados.length})</legend>
            ${suplentes.map(a => `<span class="badge badge-blue" style="margin:2px;">${a.nome}</span>`).join('')}
            ${suplentesUsados.map(a => `<span class="badge badge-orange" style="margin:2px;">${a.nome} (entrou)</span>`).join('')}
            ${!suplentes.length && !suplentesUsados.length ? '<div class="empty-state" style="padding:10px;">Sem suplentes definidos.</div>' : ''}
        </fieldset>
    </div>`;

    if (EH_TREINADOR) {
        html += `<div class="card">
            <fieldset><legend>Substituições</legend>
                ${(titulares.length && suplentes.length && !JOGO_ATUAL.fechado) ? `
                <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:14px;">
                    <div class="field" style="margin-bottom:0;"><label>Sai</label><select id="sub_sai">${titulares.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}</select></div>
                    <div class="field" style="margin-bottom:0;"><label>Entra</label><select id="sub_entra">${suplentes.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}</select></div>
                    <div class="field" style="margin-bottom:0;"><label>Minuto</label><input type="number" id="sub_minuto" min="0" max="60" style="width:80px;"></div>
                    <button class="btn btn-primary btn-sm" onclick="registarSubstituicao()">Registar</button>
                </div>` : ''}
                ${(substituicoes && substituicoes.length) ? substituicoes.map(s => `<div class="page-subtitle">⇄ Min. ${s.minuto ?? '—'}: sai <strong>${s.sai?.nome || '—'}</strong>, entra <strong>${s.entra?.nome || '—'}</strong></div>`).join('') : '<div class="empty-state" style="padding:10px;">Sem substituições registadas.</div>'}
            </fieldset>
        </div>

        <div class="card">
            <fieldset><legend>Gerir convocatória</legend>
                <table><thead><tr><th>Atleta</th><th>Estado</th></tr></thead><tbody>
                ${(atletas || []).map(a => `<tr>
                    <td>${a.nome}</td>
                    <td>
                        <select onchange="mudarPapelConvocatoria('${a.id}', this.value)" ${JOGO_ATUAL.fechado ? 'disabled' : ''}>
                            <option value="" ${!mapa[a.id] ? 'selected' : ''}>Não convocada</option>
                            <option value="convocado" ${mapa[a.id]?.tipo === 'convocado' ? 'selected' : ''}>Convocada</option>
                            <option value="titular" ${mapa[a.id]?.tipo === 'titular' ? 'selected' : ''}>Titular</option>
                            <option value="suplente" ${mapa[a.id]?.tipo === 'suplente' ? 'selected' : ''}>Suplente</option>
                        </select>
                    </td>
                </tr>`).join('')}
                </tbody></table>
            </fieldset>
        </div>`;
    } else if (convocadosSoltos.length) {
        html += `<div class="card"><fieldset><legend>Também convocadas</legend>${convocadosSoltos.map(a => `<span class="badge badge-gray" style="margin:2px;">${a.nome}</span>`).join('')}</fieldset></div>`;
    }

    el.innerHTML = html;
}

async function mudarPapelConvocatoria(atletaId, tipo) {
    if (!tipo) {
        await supabase.from('jogo_participantes').delete().eq('jogo_id', JOGO_ATUAL.id).eq('atleta_id', atletaId);
    } else {
        const { error } = await supabase.from('jogo_participantes').upsert(
            { jogo_id: JOGO_ATUAL.id, atleta_id: atletaId, tipo, posicao_tatica: tipo === 'titular' ? null : null },
            { onConflict: 'jogo_id,atleta_id' }
        );
        if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    }
    renderTabJogo('convocatoria');
}

async function atribuirPosicaoTatica(slotLabel, atletaId) {
    // limpa quem já estava nesse slot
    await supabase.from('jogo_participantes').update({ posicao_tatica: null })
        .eq('jogo_id', JOGO_ATUAL.id).eq('posicao_tatica', slotLabel);
    if (atletaId) {
        await supabase.from('jogo_participantes').update({ posicao_tatica: slotLabel })
            .eq('jogo_id', JOGO_ATUAL.id).eq('atleta_id', atletaId);
    }
    renderTabJogo('convocatoria');
}

async function registarSubstituicao() {
    const saiId = document.getElementById('sub_sai').value;
    const entraId = document.getElementById('sub_entra').value;
    const minuto = parseInt(document.getElementById('sub_minuto').value) || null;
    if (!saiId || !entraId) return;
    const { error } = await supabase.from('jogo_substituicoes').insert({ jogo_id: JOGO_ATUAL.id, atleta_sai_id: saiId, atleta_entra_id: entraId, minuto });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    await supabase.from('jogo_participantes').update({ tipo: 'suplente_utilizado' }).eq('jogo_id', JOGO_ATUAL.id).eq('atleta_id', entraId);
    mostrarToast('Substituição registada.', 'success');
    renderTabJogo('convocatoria');
}
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
        ${!JOGO_ATUAL.fechado ? '<div class="page-subtitle">🔴 Jogo em aberto — as estatísticas atualizam-se ao vivo automaticamente.</div>' : ''}
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
            <div class="field">
                <label>${label}</label>
                <div style="display:flex; align-items:center; gap:6px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="alterarCampoStat('${campo}', -1)">−</button>
                    <input type="number" min="0" id="st_${campo}" value="${s ? (s[campo] ?? 0) : 0}" style="text-align:center;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="alterarCampoStat('${campo}', 1)">+</button>
                </div>
            </div>
        `).join('');
        document.getElementById('modalStatsAtleta').classList.add('active');
    });
}
function alterarCampoStat(campo, delta) {
    const input = document.getElementById('st_' + campo);
    if (!input) return;
    input.value = Math.max(0, (parseInt(input.value) || 0) + delta);
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
