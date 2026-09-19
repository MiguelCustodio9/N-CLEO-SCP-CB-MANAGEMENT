// ============================================================
// EQUIPAS ADVERSÁRIAS — equipas.js
// ============================================================

let EQUIPAS_CACHE = [];
let EQUIPA_EM_EDICAO = null;

async function carregarEquipas() {
    const { data, error } = await supabase.from('equipas_adversarias').select('*').order('nome');
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    EQUIPAS_CACHE = data;
    const el = document.getElementById('listaEquipas');
    if (!el) return;
    if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="ico">🛡️</div>Ainda não há equipas adversárias registadas.</div>`; return; }
    el.innerHTML = `<div class="roster-grid">
        ${data.map(eq => `
            <div class="roster-card" ${EH_TREINADOR ? `style="cursor:pointer;" onclick="abrirModalEditarEquipa('${eq.id}')"` : 'style="cursor:default;"'}>
                <img class="avatar-lg" src="${eq.logo_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent(eq.nome)}" onerror="this.onerror=null; this.src='https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent('${eq.nome.replace(/'/g, "\\'")}')">
                <div class="roster-name">${eq.nome}</div>
                ${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); eliminarEquipa('${eq.id}')">Eliminar</button>` : ''}
            </div>
        `).join('')}
    </div>`;
}

function abrirModalNovaEquipa() { document.getElementById('modalNovaEquipa').classList.add('active'); }
function fecharModalNovaEquipa() { document.getElementById('modalNovaEquipa').classList.remove('active'); document.getElementById('formNovaEquipa').reset(); }

async function criarEquipa(e) {
    e.preventDefault();
    const nome = document.getElementById('neq_nome').value.trim();
    if (!nome) return;
    const { data: nova, error } = await supabase.from('equipas_adversarias').insert({ nome }).select().single();
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }

    const ficheiro = document.getElementById('neq_logo').files[0];
    if (ficheiro) {
        const caminho = `equipa-${nova.id}-${Date.now()}-${ficheiro.name}`;
        const { error: erroUpload } = await supabase.storage.from('equipas-logos').upload(caminho, ficheiro, { upsert: true });
        if (erroUpload) {
            mostrarToast('Equipa criada, mas o logótipo falhou a carregar: ' + erroUpload.message, 'error');
        } else {
            const { data: urlPublico } = supabase.storage.from('equipas-logos').getPublicUrl(caminho);
            await supabase.from('equipas_adversarias').update({ logo_url: urlPublico.publicUrl }).eq('id', nova.id);
        }
    }

    if (!ficheiro) mostrarToast('Equipa adicionada.', 'success');
    fecharModalNovaEquipa();
    await carregarEquipas();

    // se veio do formulário de "Novo Jogo", volta a preencher o select já com a equipa nova selecionada
    const selJogo = document.getElementById('nj_adversario_id');
    if (selJogo && document.getElementById('modalNovoJogo')?.classList.contains('active')) {
        await popularSelectEquipas(selJogo, nova.id);
    }
}

async function eliminarEquipa(id) {
    if (!confirm('Eliminar esta equipa adversária? Os jogos já registados contra ela mantêm-se, só deixam de ter logótipo/ligação.')) return;
    const { error } = await supabase.from('equipas_adversarias').delete().eq('id', id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    carregarEquipas();
}

// -------- editar equipa (renomear e/ou trocar o logótipo) --------
function abrirModalEditarEquipa(id) {
    const eq = EQUIPAS_CACHE.find(e => e.id === id);
    if (!eq) return;
    EQUIPA_EM_EDICAO = eq;
    document.getElementById('eeq_nome').value = eq.nome;
    document.getElementById('eeq_logo_preview').src = eq.logo_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent(eq.nome);
    document.getElementById('eeq_logo').value = '';
    document.getElementById('modalEditarEquipa').classList.add('active');
}
function fecharModalEditarEquipa() { document.getElementById('modalEditarEquipa').classList.remove('active'); EQUIPA_EM_EDICAO = null; }

function visualizarLogoEquipaEditada(event) {
    const ficheiro = event.target.files[0];
    if (!ficheiro) return;
    document.getElementById('eeq_logo_preview').src = URL.createObjectURL(ficheiro);
}

async function guardarEdicaoEquipa(e) {
    e.preventDefault();
    if (!EQUIPA_EM_EDICAO) return;
    const nome = document.getElementById('eeq_nome').value.trim();
    if (!nome) return;

    const payload = { nome };
    const ficheiro = document.getElementById('eeq_logo').files[0];
    if (ficheiro) {
        const caminho = `equipa-${EQUIPA_EM_EDICAO.id}-${Date.now()}-${ficheiro.name}`;
        const { error: erroUpload } = await supabase.storage.from('equipas-logos').upload(caminho, ficheiro, { upsert: true });
        if (erroUpload) { mostrarToast('Erro ao carregar o logótipo: ' + erroUpload.message, 'error'); return; }
        const { data: urlPublico } = supabase.storage.from('equipas-logos').getPublicUrl(caminho);
        payload.logo_url = urlPublico.publicUrl;
    }

    const { error } = await supabase.from('equipas_adversarias').update(payload).eq('id', EQUIPA_EM_EDICAO.id);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Equipa atualizada.', 'success');
    fecharModalEditarEquipa();
    carregarEquipas();
}

// usado no formulário de "Novo Jogo" para popular o select de adversários
async function popularSelectEquipas(selectEl, valorAtual) {
    if (!EQUIPAS_CACHE.length) await carregarEquipas();
    selectEl.innerHTML = `<option value="">— escolhe a equipa —</option>` +
        EQUIPAS_CACHE.map(eq => `<option value="${eq.id}" ${eq.id === valorAtual ? 'selected' : ''}>${eq.nome}</option>`).join('');
}