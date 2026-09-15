// ============================================================
// EQUIPA TÉCNICA — treinadores.js
// Permite ao treinador criar outras contas de treinador pela app,
// sem precisar de ir ao Supabase Studio.
// ============================================================

async function carregarTreinadores() {
    const { data, error } = await supabase.from('perfis').select('*').eq('tipo_utilizador', 'treinador').order('nome_utilizador');
    const el = document.getElementById('listaTreinadores');
    if (error) { el.innerHTML = `<div class="empty-state">Erro a carregar: ${error.message}</div>`; return; }
    if (!data.length) { el.innerHTML = `<div class="empty-state">Ainda não há treinadores registados.</div>`; return; }

    const meuId = SESSAO.session.user.id;
    el.innerHTML = `<table><thead><tr><th>Nome de utilizador</th><th>Criado em</th><th></th></tr></thead><tbody>
        ${data.map(p => `
            <tr>
                <td><strong>${p.nome_utilizador}</strong> ${p.id === meuId ? '<span class="badge badge-blue">Tu</span>' : ''}</td>
                <td>${p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT') : '—'}</td>
                <td></td>
            </tr>
        `).join('')}
    </tbody></table>`;
}

function abrirModalNovoTreinador() { document.getElementById('modalNovoTreinador').classList.add('active'); }
function fecharModalNovoTreinador() { document.getElementById('modalNovoTreinador').classList.remove('active'); document.getElementById('formNovoTreinador').reset(); }

async function criarTreinador(e) {
    e.preventDefault();
    const username = document.getElementById('nt_username').value.trim();
    const password = document.getElementById('nt_password').value;
    if (!username || !password) { mostrarToast('Preenche utilizador e password.', 'error'); return; }
    if (password.length < 6) { mostrarToast('A password deve ter pelo menos 6 caracteres.', 'error'); return; }

    try {
        const { data, error } = await supabase.functions.invoke('criar-utilizador', {
            body: { username, password, tipo: 'treinador' }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        mostrarToast('Treinador "' + username + '" criado com sucesso.', 'success');
        fecharModalNovoTreinador();
        carregarTreinadores();
    } catch (err) {
        mostrarToast('Não foi possível criar: ' + (err.message || err), 'error');
    }
}
