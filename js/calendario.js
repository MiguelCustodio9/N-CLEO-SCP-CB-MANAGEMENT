// ============================================================
// CALENDÁRIO — calendario.js
// ============================================================

let CAL_MES_ATUAL = new Date();
CAL_MES_ATUAL.setDate(1);

const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const NOMES_DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

async function carregarCalendario() {
    const inicioMes = CAL_MES_ATUAL.toISOString().slice(0, 10);
    const fimMesDate = new Date(CAL_MES_ATUAL.getFullYear(), CAL_MES_ATUAL.getMonth() + 1, 0);
    const fimMes = fimMesDate.toISOString().slice(0, 10);

    const { data: treinos } = await supabase.from('treinos').select('id, numero, dia, hora_inicio, local').gte('dia', inicioMes).lte('dia', fimMes);
    const { data: jogos } = await supabase.from('jogos').select('id, data, hora, adversario, casa_fora, local').gte('data', inicioMes).lte('data', fimMes);
    const { data: eventos } = await supabase.from('eventos_calendario').select('*').gte('dia', inicioMes).lte('dia', fimMes);

    const eventosPorDia = {};
    (treinos || []).forEach(t => {
        (eventosPorDia[t.dia] = eventosPorDia[t.dia] || []).push({ tipo: 'treino', label: `Treino #${t.numero}`, hora: t.hora_inicio, id: t.id });
    });
    (jogos || []).forEach(j => {
        (eventosPorDia[j.data] = eventosPorDia[j.data] || []).push({ tipo: 'jogo', label: (j.casa_fora === 'casa' ? 'vs ' : '@ ') + j.adversario, hora: j.hora, id: j.id });
    });
    (eventos || []).forEach(ev => {
        (eventosPorDia[ev.dia] = eventosPorDia[ev.dia] || []).push({ tipo: 'evento', label: ev.titulo, hora: ev.hora, id: ev.id });
    });

    renderCalendario(eventosPorDia);
}

function renderCalendario(eventosPorDia) {
    const ano = CAL_MES_ATUAL.getFullYear();
    const mes = CAL_MES_ATUAL.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    let celulas = '';
    for (let i = 0; i < primeiroDiaSemana; i++) celulas += `<div class="cal-cel cal-vazia"></div>`;
    for (let dia = 1; dia <= totalDias; dia++) {
        const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const eventos = eventosPorDia[iso] || [];
        const hoje = new Date().toISOString().slice(0, 10) === iso;
        celulas += `<div class="cal-cel ${hoje ? 'cal-hoje' : ''}">
            <div class="cal-num">${dia}</div>
            ${eventos.map(e => {
                const clique = e.tipo === 'jogo' ? `abrirJogo('${e.id}')` : e.tipo === 'treino' ? `abrirTreino('${e.id}')` : `abrirEventoCalendario('${e.id}')`;
                const classe = e.tipo === 'jogo' ? 'cal-jogo' : e.tipo === 'treino' ? 'cal-treino' : 'cal-evento-extra';
                return `<div class="cal-evento ${classe}" onclick="${clique}">${(e.hora || '').slice(0,5)} ${e.label}</div>`;
            }).join('')}
        </div>`;
    }

    document.getElementById('calendarioConteudo').innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
            <button class="btn btn-secondary btn-sm" onclick="mudarMesCalendario(-1)">← Mês anterior</button>
            <div style="font-weight:700; font-size:16px;">${NOMES_MESES[mes]} ${ano}</div>
            <button class="btn btn-secondary btn-sm" onclick="mudarMesCalendario(1)">Mês seguinte →</button>
            ${EH_TREINADOR ? `<button class="btn btn-primary btn-sm" onclick="abrirModalNovoEvento()">+ Novo Evento</button>` : ''}
        </div>
        <div class="cal-grid cal-cabecalho">${NOMES_DIAS.map(d => `<div class="cal-cel-cabecalho">${d}</div>`).join('')}</div>
        <div class="cal-grid">${celulas}</div>
        <div style="display:flex; gap:16px; margin-top:14px; font-size:12px; color:var(--muted);">
            <span><span class="cal-legenda cal-treino"></span> Treino</span>
            <span><span class="cal-legenda cal-jogo"></span> Jogo</span>
            <span><span class="cal-legenda cal-evento-extra"></span> Outro evento</span>
        </div>
    `;
}

function mudarMesCalendario(delta) {
    CAL_MES_ATUAL.setMonth(CAL_MES_ATUAL.getMonth() + delta);
    carregarCalendario();
}

// -------- eventos personalizados (reuniões, etc.) --------
function abrirModalNovoEvento() {
    document.getElementById('modalNovoEvento').classList.add('active');
    document.getElementById('ne_dia').value = new Date().toISOString().slice(0, 10);
}
function fecharModalNovoEvento() { document.getElementById('modalNovoEvento').classList.remove('active'); document.getElementById('formNovoEvento').reset(); }

async function criarEventoCalendario(e) {
    e.preventDefault();
    const payload = {
        titulo: document.getElementById('ne_titulo').value.trim(),
        dia: document.getElementById('ne_dia').value,
        hora: document.getElementById('ne_hora').value || null,
        descricao: document.getElementById('ne_descricao').value.trim() || null,
    };
    if (!payload.titulo || !payload.dia) { mostrarToast('Indica pelo menos o título e o dia.', 'error'); return; }
    const { error } = await supabase.from('eventos_calendario').insert(payload);
    if (error) { mostrarToast('Erro: ' + error.message, 'error'); return; }
    mostrarToast('Evento adicionado.', 'success');
    fecharModalNovoEvento();
    carregarCalendario();
}

async function abrirEventoCalendario(id) {
    const { data: ev, error } = await supabase.from('eventos_calendario').select('*').eq('id', id).single();
    if (error) return;
    document.getElementById('detalheEventoTitulo').textContent = ev.titulo;
    document.getElementById('detalheEventoCorpo').innerHTML = `
        <div class="page-subtitle" style="margin-bottom:10px;">${formatarData(ev.dia)}${ev.hora ? ' · ' + ev.hora.slice(0,5) : ''}</div>
        <div>${ev.descricao || 'Sem descrição.'}</div>
    `;
    document.getElementById('btnEliminarEvento').onclick = () => eliminarEventoCalendario(ev.id);
    document.getElementById('btnEliminarEvento').classList.toggle('hidden', !EH_TREINADOR);
    document.getElementById('modalDetalheEvento').classList.add('active');
}
function fecharModalDetalheEvento() { document.getElementById('modalDetalheEvento').classList.remove('active'); }
async function eliminarEventoCalendario(id) {
    if (!confirm('Eliminar este evento?')) return;
    await supabase.from('eventos_calendario').delete().eq('id', id);
    fecharModalDetalheEvento();
    carregarCalendario();
}
