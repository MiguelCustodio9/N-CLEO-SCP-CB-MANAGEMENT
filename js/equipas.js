// ============================================================
// EQUIPAS ADVERSÁRIAS — equipas.js
// ============================================================

let EQUIPAS_CACHE = [];

async function carregarEquipas() {
    const { data, error } = await supabase.from('equipas_adversarias').select('*').order('nome');
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    EQUIPAS_CACHE = data;
    const el = document.getElementById('listaEquipas');
    if (!el) return;
    if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="ico">🛡️</div>Ainda não há equipas adversárias registadas.</div>`; return; }
    el.innerHTML = `<div class="roster-grid">
        ${data.map(eq => `
            <div class="roster-card" style="cursor:default;">
                <img class="avatar-lg" src="${eq.logo_url || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent(eq.nome)}">
                <div class="roster-name">${eq.nome}</div>
                ${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="eliminarEquipa('${eq.id}')">Eliminar</button>` : ''}
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
        if (!erroUpload) {
            const { data: urlPublico } = supabase.storage.from('equipas-logos').getPublicUrl(caminho);
            await supabase.from('equipas_adversarias').update({ logo_url: urlPublico.publicUrl }).eq('id', nova.id);
        }
    }

    mostrarToast('Equipa adicionada.', 'success');
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

// usado no formulário de "Novo Jogo" para popular o select de adversários
async function popularSelectEquipas(selectEl, valorAtual) {
    if (!EQUIPAS_CACHE.length) await carregarEquipas();
    selectEl.innerHTML = `<option value="">— escolhe a equipa —</option>` +
        EQUIPAS_CACHE.map(eq => `<option value="${eq.id}" ${eq.id === valorAtual ? 'selected' : ''}>${eq.nome}</option>`).join('');
}
