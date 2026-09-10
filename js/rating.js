// ============================================================
// ALGORITMO DE CLASSIFICAÇÃO INDIVIDUAL DE JOGO (0 a 10)
// ============================================================
// Nota: não existe uma fórmula "oficial" de rating de futsal — esta é uma
// fórmula transparente e ajustável, pensada para dar peso justo a cada
// estatística. Os pesos estão todos aqui, num único sítio, para poderes
// afinar como quiseres.

const PESOS_RATING = {
    golo_marcado: 0.9,
    assistencia: 0.6,
    passe_chave: 0.15,
    passe: 0.02,
    remate: 0.08,
    drible: 0.1,
    intercecao: 0.15,
    desarme: 0.15,
    recuperacao_bola: 0.12,
    grande_oportunidade_criada: 0.35,
    defesa: 0.22,               // conta mais para guarda-redes (ver abaixo)

    perda_bola: -0.12,
    erro_originou_golo: -0.9,
    grande_oportunidade_falhada: -0.3,
    cartao_amarelo: -0.5,
    cartao_vermelho: -1.6,
    golo_sofrido_gr: -0.5,       // só penaliza assim para guarda-redes
};

function calcularClassificacao(s, posicao) {
    const ehGR = posicao === 'Guarda-Redes';
    let nota = 5.0;

    nota += (s.golos_marcados || 0) * PESOS_RATING.golo_marcado;
    nota += (s.assistencias || 0) * PESOS_RATING.assistencia;
    nota += (s.passes_chave || 0) * PESOS_RATING.passe_chave;
    nota += (s.passes || 0) * PESOS_RATING.passe;
    nota += (s.remates || 0) * PESOS_RATING.remate;
    nota += (s.dribles || 0) * PESOS_RATING.drible;
    nota += (s.intercecoes || 0) * PESOS_RATING.intercecao;
    nota += (s.desarmes || 0) * PESOS_RATING.desarme;
    nota += (s.recuperacoes_bola || 0) * PESOS_RATING.recuperacao_bola;
    nota += (s.grandes_oportunidades_criadas || 0) * PESOS_RATING.grande_oportunidade_criada;
    nota += (s.defesas || 0) * PESOS_RATING.defesa * (ehGR ? 1.4 : 0.6);

    nota += (s.perdas_bola || 0) * PESOS_RATING.perda_bola;
    nota += (s.erros_originaram_golo || 0) * PESOS_RATING.erro_originou_golo;
    nota += (s.grandes_oportunidades_falhadas || 0) * PESOS_RATING.grande_oportunidade_falhada;
    nota += (s.cartoes_amarelos || 0) * PESOS_RATING.cartao_amarelo;
    nota += (s.cartoes_vermelhos || 0) * PESOS_RATING.cartao_vermelho;
    if (ehGR) nota += (s.golos_sofridos || 0) * PESOS_RATING.golo_sofrido_gr;

    if (!s.minutos_jogados || s.minutos_jogados === 0) return null; // não jogou
    nota = Math.max(0, Math.min(10, nota));
    return Math.round(nota * 10) / 10;
}
