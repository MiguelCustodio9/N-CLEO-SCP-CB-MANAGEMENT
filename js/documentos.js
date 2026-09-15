// ============================================================
// DOCUMENTOS — documentos.js
// ============================================================

async function carregarDocumentos() {
    const { data, error } = await supabase.from('documentos').select('*').order('created_at', { ascending: false });
    const el = document.getElementById('listaDocumentos');
    if (error) { el.innerHTML = `<div class="empty-state">Erro: ${error.message}</div>`; return; }
    if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="ico">📄</div>Ainda não há documentos.</div>`; return; }
    el.innerHTML = data.map(d => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--line);">
            <div>
                <div style="font-weight:700;">${d.titulo}</div>
                ${d.categoria ? `<span class="badge badge-gray">${d.categoria}</span>` : ''}
            </div>
            <div style="display:flex; gap:8px;">
                <a href="${d.ficheiro_url}" target="_blank" class="btn btn-secondary btn-sm">⬇️ Abrir</a>
                ${EH_TREINADOR ? `<button class="btn btn-danger btn-sm" onclick="eliminarDocumento('${d.id}')">Eliminar</button>` : ''}
            </div>
        </div>
    `).join('');
}

function abrirModalNovoDocumento() { document.getElementById('modalNovoDocumento').classList.add('active'); }
function fecharModalNovoDocumento() { document.getElementById('modalNovoDocumento').classList.remove('active'); document.getElementById('formNovoDocumento').reset(); }

async function criarDocumento(e) {
    e.preventDefault();
    const titulo = document.getElementById('nd_titulo').value.trim();
    const categoria = document.getElementById('nd_categoria').value.trim();
    const ficheiro = document.getElementById('nd_ficheiro').files[0];
    if (!titulo || !ficheiro) { mostrarToast('Indica um título e escolhe um ficheiro.', 'error'); return; }

    const caminho = `${Date.now()}-${ficheiro.name}`;
    const { error: erroUpload } = await supabase.storage.from('documentos').upload(caminho, ficheiro, { upsert: true });
    if (erroUpload) { mostrarToast('Erro ao carregar ficheiro: ' + erroUpload.message, 'error'); return; }
    const { data: urlPublico } = supabase.storage.from('documentos').getPublicUrl(caminho);

    const { error } = await supabase.from('documentos').insert({ titulo, categoria: categoria || null, ficheiro_url: urlPublico.publicUrl });
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }

    mostrarToast('Documento adicionado.', 'success');
    fecharModalNovoDocumento();
    carregarDocumentos();
}

async function eliminarDocumento(id) {
    if (!confirm('Eliminar este documento?')) return;
    await supabase.from('documentos').delete().eq('id', id);
    carregarDocumentos();
}
