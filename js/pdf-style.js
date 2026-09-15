// ============================================================
// ESTILO PARTILHADO DOS PDFs — pdf-style.js
// Dá um "ar" consistente e cuidado a todos os PDFs (ficha, presenças,
// esforço), com o cabeçalho a verde do clube, logótipo e tabelas
// alinhadas (via jspdf-autotable). Não é LaTeX, mas é o mais perto
// que se consegue gerar no browser, sem servidor.
// ============================================================

const COR_CLUBE_PDF = [10, 122, 60];      // verde do clube
const COR_CLUBE_ESCURO_PDF = [6, 78, 39];
const COR_TEXTO_PDF = [30, 41, 59];
const COR_CINZA_PDF = [100, 116, 139];

let LOGO_BASE64_CACHE = null;
async function obterLogoBase64() {
    if (LOGO_BASE64_CACHE !== null) return LOGO_BASE64_CACHE;
    try {
        const resp = await fetch('assets/logo-clube.png');
        if (!resp.ok) throw new Error('sem logo');
        const blob = await resp.blob();
        LOGO_BASE64_CACHE = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        LOGO_BASE64_CACHE = false; // sem logo disponível, não tentar outra vez
    }
    return LOGO_BASE64_CACHE;
}

// Desenha o cabeçalho colorido no topo da página atual e devolve o Y onde o conteúdo pode começar.
async function desenharCabecalhoPDF(doc, titulo, subtitulo) {
    const largura = doc.internal.pageSize.getWidth();
    doc.setFillColor(...COR_CLUBE_PDF);
    doc.rect(0, 0, largura, 32, 'F');

    const logo = await obterLogoBase64();
    let x = 14;
    if (logo) {
        try { doc.addImage(logo, 'PNG', 14, 6, 20, 20); x = 40; } catch {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold'); doc.setFontSize(14);
    doc.text('Núcleo SCP Castelo Branco', x, 14);
    doc.setFont(undefined, 'normal'); doc.setFontSize(9);
    doc.text('Futsal', x, 20);

    doc.setFont(undefined, 'bold'); doc.setFontSize(12);
    doc.text(titulo, largura - 14, 14, { align: 'right' });
    if (subtitulo) {
        doc.setFont(undefined, 'normal'); doc.setFontSize(9);
        doc.text(subtitulo, largura - 14, 20, { align: 'right' });
    }

    doc.setTextColor(...COR_TEXTO_PDF);
    return 42;
}

function desenharRodapePDF(doc) {
    const paginas = doc.internal.getNumberOfPages();
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setDrawColor(...COR_CLUBE_PDF);
        doc.setLineWidth(0.6);
        doc.line(14, altura - 14, largura - 14, altura - 14);
        doc.setFontSize(8);
        doc.setTextColor(...COR_CINZA_PDF);
        doc.text('Núcleo SCP Castelo Branco — Futsal', 14, altura - 9);
        doc.text(`Página ${i} de ${paginas}`, largura - 14, altura - 9, { align: 'right' });
    }
}

// Título de secção dentro do corpo do PDF (bloco verde claro com texto do clube)
function tituloSeccaoPDF(doc, texto, y) {
    const largura = doc.internal.pageSize.getWidth();
    doc.setFillColor(230, 244, 235);
    doc.rect(14, y - 5, largura - 28, 8, 'F');
    doc.setTextColor(...COR_CLUBE_ESCURO_PDF);
    doc.setFont(undefined, 'bold'); doc.setFontSize(11);
    doc.text(texto, 17, y);
    doc.setTextColor(...COR_TEXTO_PDF);
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    return y + 10;
}

// Estilo por omissão para doc.autoTable(...) — chamar com Object.assign({}, ESTILO_TABELA_PDF, {...})
function estiloTabelaPDF(startY) {
    return {
        startY,
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: COR_CLUBE_PDF, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: COR_TEXTO_PDF },
        alternateRowStyles: { fillColor: [247, 250, 248] },
        styles: { cellPadding: 3, lineColor: [226, 232, 244], lineWidth: 0.2 },
    };
}
