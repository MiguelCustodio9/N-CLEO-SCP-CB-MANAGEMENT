// ============================================================
// PLANTEL — plantel.js
// ============================================================

let PLANTEL_CACHE = [];
let ATLETA_ATUAL = null;

const ESCALOES = ['Petiz (Sub-7)','Traquina (Sub-9)','Benjamim (Sub-11)','Infantil (Sub-13)','Iniciada (Sub-15)','Juvenil (Sub-17)','Júnior (Sub-19)','Sénior (Sub-20+)'];
const POSICOES = ['Guarda-Redes','Fixo','Ala','Pivot','Universal','Fixo/Ala','Ala/Fixo','Fixo/Pivot','Pivot/Fixo','Ala/Pivot','Pivot/Ala'];
const MOMENTOS = [['inicio_epoca','Início de época'],['meio_epoca','Meio da época'],['fim_epoca','Fim da época']];

// ---------------- ROSTER ----------------
async function carregarPlantel() {
    const { data, error } = await supabase.from('atletas').select('*').order('nome');
    if (error) { mostrarToast('Erro a carregar plantel: ' + error.message, 'error'); return; }
    PLANTEL_CACHE = data;
    const grid = document.getElementById('rosterGrid');
    const empty = document.getElementById('rosterEmpty');
    grid.innerHTML = '';
    if (!data.length) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    data.forEach(a => {
        const capBadge = a.capitania === 'capita' ? '<span class="captain-star">C</span>' :
                          a.capitania === 'vice_capita' ? '<span class="captain-star">VC</span>' :
                          a.capitania === 'terceira_capita' ? '<span class="captain-star">3C</span>' : '';
        const div = document.createElement('div');
        div.className = 'roster-card';
        div.onclick = () => abrirFichaAtleta(a.id);
        div.innerHTML = `
            <img class="avatar-lg" src="${a.foto_url || 'assets/avatar-default.png'}" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(a.nome)}'">
            <div class="roster-name">${a.nome} ${capBadge}</div>
            <div class="roster-meta">${a.posicao || 'Posição não definida'}</div>
            <div class="roster-meta">${a.escalao || ''}</div>
        `;
        grid.appendChild(div);
    });
}

// ---------------- CRIAR ATLETA ----------------
function abrirModalNovaAtleta() { document.getElementById('modalNovaAtleta').classList.add('active'); }
function fecharModalNovaAtleta() { document.getElementById('modalNovaAtleta').classList.remove('active'); document.getElementById('formNovaAtleta').reset(); }

function atualizarIdadePreview() {
    const v = document.getElementById('na_data_nascimento').value;
    const idade = calcularIdade(v);
    document.getElementById('na_idade_preview').value = idade !== null ? idade + ' anos' : '';
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formNovaAtleta');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nome: document.getElementById('na_nome').value.trim(),
            nome_completo: document.getElementById('na_nome_completo').value.trim() || null,
            data_nascimento: document.getElementById('na_data_nascimento').value || null,
            pais_nascimento: document.getElementById('na_pais_nascimento').value.trim() || null,
            nacionalidade: document.getElementById('na_nacionalidade').value.trim() || null,
            dupla_nacionalidade: document.getElementById('na_dupla_nacionalidade').value.trim() || null,
            contacto: document.getElementById('na_contacto').value.trim() || null,
            escalao: document.getElementById('na_escalao').value || null,
            posicao: document.getElementById('na_posicao').value || null,
            anos_pratica_federada: document.getElementById('na_anos_pratica').value || null,
            clube_anterior: document.getElementById('na_clube_anterior').value.trim() || null,
            desportos_extra: document.getElementById('na_desportos_extra').value.trim() || null,
            atividades_extra: document.getElementById('na_atividades_extra').value.trim() || null,
            nome_pai: document.getElementById('na_nome_pai').value.trim() || null,
            contacto_pai: document.getElementById('na_contacto_pai').value.trim() || null,
            nome_mae: document.getElementById('na_nome_mae').value.trim() || null,
            contacto_mae: document.getElementById('na_contacto_mae').value.trim() || null,
            email_encarregado: document.getElementById('na_email_encarregado').value.trim() || null,
            escola: document.getElementById('na_escola').value.trim() || null,
            ano_escolar: document.getElementById('na_ano_escolar').value.trim() || null,
            disciplina_favorita: document.getElementById('na_disciplina_favorita').value.trim() || null,
        };

        const { data: nova, error } = await supabase.from('atletas').insert(payload).select().single();
        if (error) { mostrarToast('Erro ao guardar: ' + error.message, 'error'); return; }

        const username = document.getElementById('na_username').value.trim();
        const password = document.getElementById('na_password').value;
        if (username && password) {
            await criarAcessoAtleta(nova.id, username, password);
        }

        mostrarToast('Atleta adicionada com sucesso!', 'success');
        fecharModalNovaAtleta();
        await carregarPlantel();
        abrirFichaAtleta(nova.id);
    });
});

async function criarAcessoAtleta(atletaId, username, password) {
    try {
        const { data, error } = await supabase.functions.invoke('criar-utilizador', {
            body: { username, password, atleta_id: atletaId }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        mostrarToast('Acesso criado para ' + username, 'success');
    } catch (err) {
        mostrarToast('Não foi possível criar o acesso (a Edge Function "criar-utilizador" está deployada no Supabase?). ' + (err.message || ''), 'error');
    }
}

// ---------------- ELIMINAR ATLETA ----------------
async function eliminarAtleta(id) {
    if (!confirm('Eliminar esta atleta e todos os seus dados? Esta ação não pode ser revertida.')) return;
    const { error } = await supabase.from('atletas').delete().eq('id', id);
    if (error) { mostrarToast('Erro ao eliminar: ' + error.message, 'error'); return; }
    mostrarToast('Atleta eliminada.', 'success');
    voltarAoPlantel();
}

// ---------------- CAPITANIA ----------------
async function definirCapitania(id, valor) {
    if (valor) {
        // limpar quem já tinha esse posto
        await supabase.from('atletas').update({ capitania: null }).eq('capitania', valor);
    }
    const { error } = await supabase.from('atletas').update({ capitania: valor || null }).eq('id', id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Capitania atualizada.', 'success');
    abrirFichaAtleta(id);
}

// ---------------- FICHA DA ATLETA (detalhe com tabs) ----------------
async function abrirFichaAtleta(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-atleta').classList.remove('hidden');

    const { data: a, error } = await supabase.from('atletas').select('*').eq('id', id).single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    ATLETA_ATUAL = a;

    const idade = calcularIdade(a.data_nascimento);
    const menor = idade !== null && idade < 18;

    document.getElementById('fichaAtletaConteudo').innerHTML = `
        <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap; margin-bottom:20px;">
            <img class="avatar-lg" src="${a.foto_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(a.nome)}">
            <div style="flex:1;">
                <div style="font-size:20px; font-weight:800;">${a.nome} ${a.capitania ? `<span class="badge badge-orange">${a.capitania === 'capita' ? 'Capitã' : a.capitania === 'vice_capita' ? 'Vice-Capitã' : '3ª Capitã'}</span>` : ''}</div>
                <div class="page-subtitle" style="margin-bottom:0;">${a.posicao || '—'} · ${a.escalao || '—'} ${idade !== null ? '· ' + idade + ' anos' : ''}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="gerarFichaPDF()">📄 Ficha em PDF</button>
                <button class="btn btn-danger btn-sm" onclick="eliminarAtleta('${a.id}')">Eliminar</button>
            </div>
        </div>

        <div class="tabs" id="fichaTabs">
            <div class="tab active" data-tab="dados">Dados</div>
            <div class="tab" data-tab="notas">Notas Escolares</div>
            <div class="tab" data-tab="fisico">Físico</div>
            <div class="tab" data-tab="tecnico">Técnico</div>
            <div class="tab" data-tab="clinico">Clínico</div>
            <div class="tab" data-tab="acesso">Acesso</div>
        </div>

        <div id="tabContent"></div>
    `;

    document.querySelectorAll('#fichaTabs .tab').forEach(t => {
        t.addEventListener('click', () => {
            document.querySelectorAll('#fichaTabs .tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            renderTabAtleta(t.dataset.tab);
        });
    });

    renderTabAtleta('dados');
}

function renderTabAtleta(tab) {
    const el = document.getElementById('tabContent');
    const a = ATLETA_ATUAL;
    const idade = calcularIdade(a.data_nascimento);
    const menor = idade !== null && idade < 18;

    if (tab === 'dados') {
        el.innerHTML = `
        <div class="card">
            <form id="formEditarAtleta">
                <fieldset><legend>Dados pessoais</legend>
                    <div class="grid grid-2">
                        ${campo('Nome', 'nome', a.nome, 'text', true)}
                        ${campo('Nome completo', 'nome_completo', a.nome_completo)}
                        ${campo('Foto (URL)', 'foto_url', a.foto_url, 'text')}
                        ${campo('Data de nascimento', 'data_nascimento', a.data_nascimento, 'date')}
                        ${campo('Idade', null, idade !== null ? idade + ' anos' : '', 'text', false, true)}
                        ${campo('País de nascimento', 'pais_nascimento', a.pais_nascimento)}
                        ${campo('Nacionalidade', 'nacionalidade', a.nacionalidade)}
                        ${campo('Dupla nacionalidade', 'dupla_nacionalidade', a.dupla_nacionalidade)}
                        ${campo('Contacto da atleta', 'contacto', a.contacto)}
                    </div>
                </fieldset>
                <fieldset><legend>Futsal</legend>
                    <div class="grid grid-2">
                        ${select('Escalão', 'escalao', ESCALOES, a.escalao)}
                        ${select('Posição', 'posicao', POSICOES, a.posicao)}
                        ${campo('Anos de prática federada', 'anos_pratica_federada', a.anos_pratica_federada, 'number')}
                        ${campo('Clube anterior', 'clube_anterior', a.clube_anterior)}
                        ${campo('Desportos extra-futsal', 'desportos_extra', a.desportos_extra)}
                        ${campo('Atividades extra-desporto', 'atividades_extra', a.atividades_extra)}
                    </div>
                </fieldset>
                <fieldset><legend>Capitania</legend>
                    <div class="pill-toggle">
                        <button type="button" class="${a.capitania==='capita'?'active':''}" onclick="definirCapitania('${a.id}', ${a.capitania==='capita'?'null':"'capita'"})">Capitã</button>
                        <button type="button" class="${a.capitania==='vice_capita'?'active':''}" onclick="definirCapitania('${a.id}', ${a.capitania==='vice_capita'?'null':"'vice_capita'"})">Vice-Capitã</button>
                        <button type="button" class="${a.capitania==='terceira_capita'?'active':''}" onclick="definirCapitania('${a.id}', ${a.capitania==='terceira_capita'?'null':"'terceira_capita'"})">3ª Capitã</button>
                    </div>
                </fieldset>
                ${menor ? `
                <fieldset><legend>Encarregados de educação</legend>
                    <div class="grid grid-2">
                        ${campo('Nome do pai', 'nome_pai', a.nome_pai)}
                        ${campo('Contacto do pai', 'contacto_pai', a.contacto_pai)}
                        ${campo('Nome da mãe', 'nome_mae', a.nome_mae)}
                        ${campo('Contacto da mãe', 'contacto_mae', a.contacto_mae)}
                        ${campo('Email do encarregado de educação', 'email_encarregado', a.email_encarregado, 'email')}
                    </div>
                </fieldset>` : `<div class="page-subtitle">Campos de encarregados de educação ficam disponíveis quando a atleta é menor de idade.</div>`}
                <fieldset><legend>Escola</legend>
                    <div class="grid grid-3">
                        ${campo('Escola', 'escola', a.escola)}
                        ${campo('Ano escolar', 'ano_escolar', a.ano_escolar)}
                        ${campo('Disciplina favorita (exceto E.F.)', 'disciplina_favorita', a.disciplina_favorita)}
                    </div>
                </fieldset>
                <button type="submit" class="btn btn-primary">Guardar alterações</button>
            </form>
        </div>`;
        document.getElementById('formEditarAtleta').addEventListener('submit', guardarEdicaoAtleta);
    }

    if (tab === 'notas') renderNotasEscolares(el);
    if (tab === 'fisico') renderAcompanhamento(el, 'fisico');
    if (tab === 'tecnico') renderAcompanhamento(el, 'tecnico');
    if (tab === 'clinico') renderHistoricoClinico(el);
    if (tab === 'acesso') renderAcesso(el);
}

function campo(label, id, valor, tipo, obrigatorio, disabled) {
    return `<div class="field"><label>${label}</label><input type="${tipo || 'text'}" ${id ? `id="fa_${id}"` : ''} value="${valor ?? ''}" ${obrigatorio ? 'required' : ''} ${disabled ? 'disabled' : ''}></div>`;
}
function select(label, id, opcoes, valorAtual) {
    return `<div class="field"><label>${label}</label><select id="fa_${id}"><option value="">—</option>${opcoes.map(o => `<option ${o === valorAtual ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
}

async function guardarEdicaoAtleta(e) {
    e.preventDefault();
    const ids = ['nome','nome_completo','foto_url','data_nascimento','pais_nascimento','nacionalidade','dupla_nacionalidade','contacto',
        'escalao','posicao','anos_pratica_federada','clube_anterior','desportos_extra','atividades_extra',
        'nome_pai','contacto_pai','nome_mae','contacto_mae','email_encarregado','escola','ano_escolar','disciplina_favorita'];
    const payload = {};
    ids.forEach(id => {
        const elx = document.getElementById('fa_' + id);
        if (elx) payload[id] = elx.value || null;
    });
    payload.updated_at = new Date().toISOString();
    const { error } = await supabase.from('atletas').update(payload).eq('id', ATLETA_ATUAL.id);
    if (error) { mostrarToast('Erro ao guardar: ' + error.message, 'error'); return; }
    mostrarToast('Dados atualizados.', 'success');
    abrirFichaAtleta(ATLETA_ATUAL.id);
}

// ---------------- NOTAS ESCOLARES ----------------
async function renderNotasEscolares(el) {
    const { data: disciplinas } = await supabase.from('disciplinas_academicas').select('*, notas_academicas(*)').eq('atleta_id', ATLETA_ATUAL.id).order('nome_disciplina');
    el.innerHTML = `
        <div class="card">
            <div style="display:flex; gap:10px; align-items:flex-end; margin-bottom:18px; flex-wrap:wrap;">
                <div class="field" style="margin-bottom:0;"><label>Nova disciplina</label><input type="text" id="novaDisciplinaNome" placeholder="ex: Matemática"></div>
                <div class="field" style="margin-bottom:0;"><label>Nº de períodos/módulos</label><input type="number" id="novaDisciplinaPeriodos" value="3" min="1" max="12" style="width:100px;"></div>
                <button class="btn btn-primary" onclick="adicionarDisciplina()">+ Adicionar disciplina</button>
            </div>
            <div id="tabelaNotas"></div>
        </div>
    `;

    const tabela = document.getElementById('tabelaNotas');
    if (!disciplinas || !disciplinas.length) {
        tabela.innerHTML = '<div class="empty-state">Ainda sem disciplinas registadas.</div>';
        return;
    }

    let html = '<table><thead><tr><th>Disciplina</th>';
    const maxPeriodos = Math.max(...disciplinas.map(d => d.num_periodos));
    for (let p = 1; p <= maxPeriodos; p++) html += `<th>P${p}</th>`;
    html += '<th></th></tr></thead><tbody>';
    disciplinas.forEach(d => {
        html += `<tr><td>${d.nome_disciplina}</td>`;
        for (let p = 1; p <= maxPeriodos; p++) {
            if (p > d.num_periodos) { html += '<td></td>'; continue; }
            const notaObj = (d.notas_academicas || []).find(n => n.periodo === p);
            html += `<td><input type="number" step="0.1" min="0" max="20" style="width:64px;" value="${notaObj ? notaObj.nota ?? '' : ''}" onchange="guardarNota('${d.id}', ${p}, this.value)"></td>`;
        }
        html += `<td><button class="btn btn-danger btn-sm" onclick="eliminarDisciplina('${d.id}')">Remover</button></td></tr>`;
    });
    html += '</tbody></table>';
    tabela.innerHTML = html;
}

async function adicionarDisciplina() {
    const nome = document.getElementById('novaDisciplinaNome').value.trim();
    const periodos = parseInt(document.getElementById('novaDisciplinaPeriodos').value) || 3;
    if (!nome) return;
    const { error } = await supabase.from('disciplinas_academicas').insert({ atleta_id: ATLETA_ATUAL.id, nome_disciplina: nome, num_periodos: periodos });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    renderTabAtleta('notas');
}
async function eliminarDisciplina(id) {
    if (!confirm('Remover esta disciplina e as suas notas?')) return;
    await supabase.from('disciplinas_academicas').delete().eq('id', id);
    renderTabAtleta('notas');
}
async function guardarNota(disciplinaId, periodo, valor) {
    if (valor === '') return;
    const { error } = await supabase.from('notas_academicas').upsert({ disciplina_id: disciplinaId, periodo, nota: parseFloat(valor) }, { onConflict: 'disciplina_id,periodo' });
    if (error) mostrarToast('Erro ao guardar nota: ' + error.message, 'error');
    else mostrarToast('Nota guardada.', 'success');
}

// ---------------- ACOMPANHAMENTO FÍSICO / TÉCNICO ----------------
async function renderAcompanhamento(el, tipo) {
    const tabela = tipo === 'fisico' ? 'acompanhamento_fisico' : 'acompanhamento_tecnico';
    const { data } = await supabase.from(tabela).select('*').eq('atleta_id', ATLETA_ATUAL.id);
    const porMomento = {};
    (data || []).forEach(r => porMomento[r.momento] = r);

    let camposHtml = '';
    MOMENTOS.forEach(([chave, label]) => {
        const r = porMomento[chave] || {};
        if (tipo === 'fisico') {
            camposHtml += `
            <fieldset><legend>${label}</legend>
                <div class="grid grid-3">
                    <div class="field"><label>Peso (kg)</label><input type="number" step="0.1" id="af_${chave}_peso" value="${r.peso_kg ?? ''}"></div>
                    <div class="field"><label>Altura (cm)</label><input type="number" step="0.1" id="af_${chave}_altura" value="${r.altura_cm ?? ''}"></div>
                    <div class="field"><label>IMC (automático)</label><input type="text" disabled value="${r.imc ?? '—'}"></div>
                </div>
            </fieldset>`;
        } else {
            camposHtml += `
            <fieldset><legend>${label}</legend>
                <div class="grid grid-4">
                    <div class="field"><label>Passe</label><input type="number" step="0.1" min="0" max="10" id="at_${chave}_passe" value="${r.passe ?? ''}"></div>
                    <div class="field"><label>Receção, controlo e domínio</label><input type="number" step="0.1" min="0" max="10" id="at_${chave}_rcd" value="${r.recepcao_controlo_dominio ?? ''}"></div>
                    <div class="field"><label>Condução</label><input type="number" step="0.1" min="0" max="10" id="at_${chave}_conducao" value="${r.conducao ?? ''}"></div>
                    <div class="field"><label>Remate</label><input type="number" step="0.1" min="0" max="10" id="at_${chave}_remate" value="${r.remate ?? ''}"></div>
                </div>
            </fieldset>`;
        }
    });

    el.innerHTML = `<div class="card"><form id="formAcompanhamento_${tipo}">${camposHtml}<button type="submit" class="btn btn-primary">Guardar</button></form></div>`;

    document.getElementById(`formAcompanhamento_${tipo}`).addEventListener('submit', async (e) => {
        e.preventDefault();
        for (const [chave] of MOMENTOS) {
            let payload;
            if (tipo === 'fisico') {
                const peso = document.getElementById(`af_${chave}_peso`).value;
                const altura = document.getElementById(`af_${chave}_altura`).value;
                if (!peso && !altura) continue;
                payload = { atleta_id: ATLETA_ATUAL.id, momento: chave, peso_kg: peso || null, altura_cm: altura || null };
            } else {
                const passe = document.getElementById(`at_${chave}_passe`).value;
                const rcd = document.getElementById(`at_${chave}_rcd`).value;
                const conducao = document.getElementById(`at_${chave}_conducao`).value;
                const remate = document.getElementById(`at_${chave}_remate`).value;
                if (!passe && !rcd && !conducao && !remate) continue;
                payload = { atleta_id: ATLETA_ATUAL.id, momento: chave, passe: passe || null, recepcao_controlo_dominio: rcd || null, conducao: conducao || null, remate: remate || null };
            }
            const { error } = await supabase.from(tabela).upsert(payload, { onConflict: 'atleta_id,momento' });
            if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
        }
        mostrarToast('Acompanhamento guardado.', 'success');
        renderTabAtleta(tipo);
    });
}

// ---------------- HISTÓRICO CLÍNICO ----------------
async function renderHistoricoClinico(el) {
    const { data } = await supabase.from('historico_clinico').select('*').eq('atleta_id', ATLETA_ATUAL.id).order('data_inicio', { ascending: false });
    const tipoLabel = { lesao: 'Lesão', medicacao: 'Medicação', problema_saude: 'Problema de saúde' };
    const tipoCor = { lesao: 'badge-red', medicacao: 'badge-blue', problema_saude: 'badge-orange' };

    el.innerHTML = `
        <div class="card">
            <fieldset><legend>Adicionar registo</legend>
                <div class="grid grid-2">
                    <div class="field"><label>Tipo</label>
                        <select id="hc_tipo"><option value="lesao">Lesão</option><option value="medicacao">Medicação</option><option value="problema_saude">Problema de saúde</option></select>
                    </div>
                    <div class="field"><label>Título</label><input type="text" id="hc_titulo" placeholder="ex: Entorse de tornozelo"></div>
                    <div class="field"><label>Data de início</label><input type="date" id="hc_data_inicio"></div>
                    <div class="field"><label>Data de fim (se aplicável)</label><input type="date" id="hc_data_fim"></div>
                </div>
                <div class="field"><label>Descrição</label><textarea id="hc_descricao" rows="3"></textarea></div>
                <button class="btn btn-primary" onclick="adicionarHistoricoClinico()">Adicionar</button>
            </fieldset>
            <div id="listaClinica"></div>
        </div>
    `;

    const lista = document.getElementById('listaClinica');
    if (!data || !data.length) { lista.innerHTML = '<div class="empty-state">Sem registos clínicos.</div>'; return; }
    lista.innerHTML = data.map(r => `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 0; border-bottom:1px solid var(--line);">
            <div>
                <span class="badge ${tipoCor[r.tipo]}">${tipoLabel[r.tipo]}</span>
                <strong style="margin-left:8px;">${r.titulo}</strong>
                <div class="page-subtitle" style="margin:4px 0 0;">${r.data_inicio || ''}${r.data_fim ? ' → ' + r.data_fim : ''}</div>
                ${r.descricao ? `<div style="font-size:13px; margin-top:6px;">${r.descricao}</div>` : ''}
            </div>
            <button class="btn btn-danger btn-sm" onclick="eliminarHistoricoClinico('${r.id}')">Remover</button>
        </div>
    `).join('');
}

async function adicionarHistoricoClinico() {
    const payload = {
        atleta_id: ATLETA_ATUAL.id,
        tipo: document.getElementById('hc_tipo').value,
        titulo: document.getElementById('hc_titulo').value.trim(),
        descricao: document.getElementById('hc_descricao').value.trim() || null,
        data_inicio: document.getElementById('hc_data_inicio').value || null,
        data_fim: document.getElementById('hc_data_fim').value || null,
    };
    if (!payload.titulo) { mostrarToast('Indica um título para o registo.', 'error'); return; }
    const { error } = await supabase.from('historico_clinico').insert(payload);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    renderTabAtleta('clinico');
}
async function eliminarHistoricoClinico(id) {
    if (!confirm('Remover este registo?')) return;
    await supabase.from('historico_clinico').delete().eq('id', id);
    renderTabAtleta('clinico');
}

// ---------------- ACESSO (criar login) ----------------
function renderAcesso(el) {
    const a = ATLETA_ATUAL;
    if (a.user_id) {
        el.innerHTML = `<div class="card"><div class="badge badge-green">Esta atleta já tem conta criada</div></div>`;
        return;
    }
    el.innerHTML = `
    <div class="card">
        <div class="page-subtitle">Esta atleta ainda não tem login. Cria um nome de utilizador e password para lhe dar acesso.</div>
        <div class="grid grid-2">
            <div class="field"><label>Nome de utilizador</label><input type="text" id="acesso_username"></div>
            <div class="field"><label>Password</label><input type="password" id="acesso_password"></div>
        </div>
        <button class="btn btn-primary" onclick="criarAcessoDaFicha()">Criar acesso</button>
    </div>`;
}
async function criarAcessoDaFicha() {
    const username = document.getElementById('acesso_username').value.trim();
    const password = document.getElementById('acesso_password').value;
    if (!username || !password) { mostrarToast('Preenche utilizador e password.', 'error'); return; }
    await criarAcessoAtleta(ATLETA_ATUAL.id, username, password);
    abrirFichaAtleta(ATLETA_ATUAL.id);
}

// ---------------- PDF DA FICHA ----------------
async function gerarFichaPDF() {
    const a = ATLETA_ATUAL;
    const idade = calcularIdade(a.data_nascimento);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 18;
    const linha = (txt, tam, negrito) => {
        doc.setFontSize(tam || 11);
        doc.setFont(undefined, negrito ? 'bold' : 'normal');
        doc.text(String(txt), 14, y);
        y += (tam || 11) * 0.5 + 3;
    };

    linha('Núcleo SCP Castelo Branco — Ficha Individual', 16, true);
    linha(a.nome, 13, true);
    y += 2;
    linha(`Nome completo: ${a.nome_completo || '—'}`);
    linha(`Data de nascimento: ${a.data_nascimento || '—'}  (Idade: ${idade ?? '—'})`);
    linha(`País de nascimento: ${a.pais_nascimento || '—'}   Nacionalidade: ${a.nacionalidade || '—'}`);
    linha(`Dupla nacionalidade: ${a.dupla_nacionalidade || '—'}`);
    linha(`Contacto: ${a.contacto || '—'}`);
    y += 2;
    linha('Futsal', 13, true);
    linha(`Escalão: ${a.escalao || '—'}   Posição: ${a.posicao || '—'}`);
    linha(`Anos de prática federada: ${a.anos_pratica_federada ?? '—'}   Clube anterior: ${a.clube_anterior || '—'}`);
    linha(`Desportos extra-futsal: ${a.desportos_extra || '—'}`);
    linha(`Atividades extra-desporto: ${a.atividades_extra || '—'}`);
    linha(`Capitania: ${a.capitania === 'capita' ? 'Capitã' : a.capitania === 'vice_capita' ? 'Vice-Capitã' : a.capitania === 'terceira_capita' ? '3ª Capitã' : '—'}`);
    y += 2;

    if (idade !== null && idade < 18) {
        linha('Encarregados de Educação', 13, true);
        linha(`Pai: ${a.nome_pai || '—'}  (${a.contacto_pai || '—'})`);
        linha(`Mãe: ${a.nome_mae || '—'}  (${a.contacto_mae || '—'})`);
        linha(`Email do encarregado de educação: ${a.email_encarregado || '—'}`);
        y += 2;
    }

    linha('Escola', 13, true);
    linha(`Escola: ${a.escola || '—'}   Ano: ${a.ano_escolar || '—'}   Disciplina favorita: ${a.disciplina_favorita || '—'}`);
    y += 2;

    const { data: fisico } = await supabase.from('acompanhamento_fisico').select('*').eq('atleta_id', a.id);
    const { data: tecnico } = await supabase.from('acompanhamento_tecnico').select('*').eq('atleta_id', a.id);
    const { data: clinico } = await supabase.from('historico_clinico').select('*').eq('atleta_id', a.id);

    linha('Acompanhamento Físico', 13, true);
    MOMENTOS.forEach(([chave, label]) => {
        const r = (fisico || []).find(x => x.momento === chave);
        linha(`${label}: Peso ${r?.peso_kg ?? '—'} kg | Altura ${r?.altura_cm ?? '—'} cm | IMC ${r?.imc ?? '—'}`);
    });
    y += 2;

    linha('Acompanhamento Técnico', 13, true);
    MOMENTOS.forEach(([chave, label]) => {
        const r = (tecnico || []).find(x => x.momento === chave);
        linha(`${label}: Passe ${r?.passe ?? '—'} | Receção/Controlo/Domínio ${r?.recepcao_controlo_dominio ?? '—'} | Condução ${r?.conducao ?? '—'} | Remate ${r?.remate ?? '—'}`);
    });
    y += 2;

    linha('Histórico Clínico e de Saúde', 13, true);
    if (clinico && clinico.length) {
        clinico.forEach(r => linha(`[${r.tipo}] ${r.titulo} — ${r.data_inicio || ''}${r.data_fim ? ' a ' + r.data_fim : ''}${r.descricao ? ': ' + r.descricao : ''}`, 10));
    } else {
        linha('Sem registos.', 10);
    }

    doc.save(`Ficha_${a.nome.replace(/\s+/g, '_')}.pdf`);
}
