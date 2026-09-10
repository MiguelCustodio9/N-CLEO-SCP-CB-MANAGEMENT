// Helpers de autenticação e proteção de páginas.
// Login por "nome de utilizador": internamente convertemos para um email
// técnico (utilizador@nucleoscp.app) porque o Supabase Auth exige email,
// mas em toda a interface só se vê/usa o nome de utilizador.

function usernameParaEmailTecnico(username) {
    return username.trim().toLowerCase().replace(/\s+/g, '.') + "@nucleoscp.app";
}

async function fazerLogin(username, password) {
    const email = usernameParaEmailTecnico(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function fazerLogout() {
    await supabase.auth.signOut();
    window.location.href = "index.html";
}

// Devolve { session, perfil } ou redireciona para o login se não autenticado.
// paginaEsperada: 'treinador' | 'jogador' | null (null = aceita qualquer um)
async function protegerPagina(paginaEsperada) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return null; }

    const { data: perfil, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !perfil) { window.location.href = "index.html"; return null; }

    if (paginaEsperada && perfil.tipo_utilizador !== paginaEsperada) {
        window.location.href = perfil.tipo_utilizador === 'treinador' ? 'treinador.html' : 'jogador.html';
        return null;
    }

    return { session, perfil };
}

function mostrarToast(msg, tipo) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = 'toast show' + (tipo ? ' ' + tipo : '');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 3200);
}

function calcularIdade(dataNascimentoISO) {
    if (!dataNascimentoISO) return null;
    const hoje = new Date();
    const nasc = new Date(dataNascimentoISO);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
}
