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

    const eventosPorDia = {};
    (treinos || []).forEach(t => {
        (eventosPorDia[t.dia] = eventosPorDia[t.dia] || []).push({ tipo: 'treino', label: `Treino #${t.numero}`, hora: t.hora_inicio, id: t.id });
    });
    (jogos || []).forEach(j => {
        (eventosPorDia[j.data] = eventosPorDia[j.data] || []).push({ tipo: 'jogo', label: (j.casa_fora === 'casa' ? 'vs ' : '@ ') + j.adversario, hora: j.hora, id: j.id });
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
            ${eventos.map(e => `<div class="cal-evento ${e.tipo === 'jogo' ? 'cal-jogo' : 'cal-treino'}" onclick="${e.tipo === 'jogo' ? `abrirJogo('${e.id}')` : `abrirTreino('${e.id}')`}">${(e.hora || '').slice(0,5)} ${e.label}</div>`).join('')}
        </div>`;
    }

    document.getElementById('calendarioConteudo').innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
            <button class="btn btn-secondary btn-sm" onclick="mudarMesCalendario(-1)">← Mês anterior</button>
            <div style="font-weight:700; font-size:16px;">${NOMES_MESES[mes]} ${ano}</div>
            <button class="btn btn-secondary btn-sm" onclick="mudarMesCalendario(1)">Mês seguinte →</button>
        </div>
        <div class="cal-grid cal-cabecalho">${NOMES_DIAS.map(d => `<div class="cal-cel-cabecalho">${d}</div>`).join('')}</div>
        <div class="cal-grid">${celulas}</div>
        <div style="display:flex; gap:16px; margin-top:14px; font-size:12px; color:var(--muted);">
            <span><span class="cal-legenda cal-treino"></span> Treino</span>
            <span><span class="cal-legenda cal-jogo"></span> Jogo</span>
        </div>
    `;
}

function mudarMesCalendario(delta) {
    CAL_MES_ATUAL.setMonth(CAL_MES_ATUAL.getMonth() + delta);
    carregarCalendario();
}
