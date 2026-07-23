if (sessionStorage.getItem('perfil') !== 'ADMIN') { window.location.href = 'index.html'; }

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

const API_VENDAS_PERIODO   = "http://localhost:8080/api/vendas/periodo";
const API_CAIXA_PERIODO    = "http://localhost:8080/api/caixa/periodo";
const API_CAIXA_RESUMO     = "http://localhost:8080/api/caixa";
const API_LOCACOES_PERIODO = "http://localhost:8080/api/locacoes/periodo";

const FORMA_LABELS = {
    DINHEIRO: "Dinheiro",
    CREDITO:  "Crédito",
    DEBITO:   "Débito",
    PIX:      "PIX",
};

let dadosRankingAtual   = [];
let vendasParaRanking   = [];
let vendasAtuais        = [];
let caixasAtuais        = [];
let colunaRanking       = "qtd";
let ordemRankingAsc     = false;
// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

definirDataDeHoje();
filtrarRelatorios();
inicializarPegueMonte();

function definirDataDeHoje() {
    const hoje = new Date().toISOString().split("T")[0];
    document.getElementById("dataInicio").value = hoje;
    document.getElementById("dataFim").value    = hoje;
}

// =============================================================================
// FILTRO PRINCIPAL
// =============================================================================

async function filtrarRelatorios() {
    const inicio = document.getElementById("dataInicio").value;
    const fim    = document.getElementById("dataFim").value;

    if (!inicio || !fim) {
        alert("Por favor, selecione as duas datas!");
        return;
    }

    atualizarTextoPeriodo(inicio, fim);

    try {
        const [vendas, caixas] = await Promise.all([
            fetch(`${API_VENDAS_PERIODO}?inicio=${inicio}&fim=${fim}`).then((r) => r.json()),
            fetch(`${API_CAIXA_PERIODO}?inicio=${inicio}&fim=${fim}`).then((r) => r.json()).catch(() => []),
        ]);

        vendasAtuais = vendas;
        caixasAtuais = caixas || [];

        renderizarEstatisticas(vendas);
        renderizarBreakdownPagamento(vendas);
        renderizarTurnos(caixas, vendas);
        renderizarGraficoHorarios(vendas);
        renderizarGraficoDiasSemana(vendas);
        renderizarRanking(vendas);
        renderizarHistorico(vendas);

    } catch (erro) {
        console.error("Erro ao filtrar relatórios:", erro);
        if (typeof showToast === "function") {
            showToast("Erro ao carregar os relatórios. Verifique se o sistema está no ar.", "erro");
        }
    }
}

function atualizarTextoPeriodo(inicio, fim) {
    const formatado = (data) => new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
    document.getElementById("periodo-selecionado").innerText =
        `Período: ${formatado(inicio)} até ${formatado(fim)}`;
}

// =============================================================================
// ESTATÍSTICAS GERAIS (cards)
// =============================================================================

function renderizarEstatisticas(vendas) {
    const qtd          = vendas.length;
    const faturamento  = vendas.reduce((acc, v) => acc + v.valorTotal, 0);
    const ticketMedio  = qtd > 0 ? faturamento / qtd : 0;

    document.getElementById("total-vendas-qtd").innerText    = qtd;
    document.getElementById("total-faturado-valor").innerText = `R$ ${faturamento.toFixed(2)}`;
    document.getElementById("ticket-medio").innerText         = `R$ ${ticketMedio.toFixed(2)}`;

    // Horário de pico
    if (qtd > 0) {
        const porHora = agruparPorHora(vendas);
        let maxHora   = 0;
        let maxQtd    = 0;

        Object.entries(porHora).forEach(([hora, dados]) => {
            if (dados.qtd > maxQtd) {
                maxQtd  = dados.qtd;
                maxHora = parseInt(hora);
            }
        });

        document.getElementById("horario-pico").innerText = `${String(maxHora).padStart(2, "0")}:00`;
    } else {
        document.getElementById("horario-pico").innerText = "--:--";
    }
}

// =============================================================================
// BREAKDOWN POR FORMA DE PAGAMENTO
// =============================================================================

function renderizarBreakdownPagamento(vendas) {
    const totais = { DINHEIRO: 0, CREDITO: 0, DEBITO: 0, PIX: 0 };

    vendas.forEach((v) => {
        const forma = v.formaPagamento || "DINHEIRO";
        if (totais.hasOwnProperty(forma)) totais[forma] += v.valorTotal;
    });

    const maximo = Math.max(...Object.values(totais), 1);

    document.getElementById("pgto-dinheiro").innerText = `R$ ${totais.DINHEIRO.toFixed(2)}`;
    document.getElementById("pgto-credito").innerText  = `R$ ${totais.CREDITO.toFixed(2)}`;
    document.getElementById("pgto-debito").innerText   = `R$ ${totais.DEBITO.toFixed(2)}`;
    document.getElementById("pgto-pix").innerText      = `R$ ${totais.PIX.toFixed(2)}`;

    document.getElementById("pgto-barra-dinheiro").style.width = `${(totais.DINHEIRO / maximo) * 100}%`;
    document.getElementById("pgto-barra-credito").style.width  = `${(totais.CREDITO / maximo) * 100}%`;
    document.getElementById("pgto-barra-debito").style.width   = `${(totais.DEBITO / maximo) * 100}%`;
    document.getElementById("pgto-barra-pix").style.width      = `${(totais.PIX / maximo) * 100}%`;
}

// =============================================================================
// RESUMO POR TURNOS (CAIXAS)
// =============================================================================

function calcularMetricasTurno(caixa, vendas) {
    const abertura   = new Date(caixa.dataAbertura);
    const fechamento = caixa.dataFechamento ? new Date(caixa.dataFechamento) : null;
    const fimMs      = fechamento ? fechamento.getTime() : Date.now();

    // Vendas novas têm caixaId (vínculo exato com o turno);
    // vendas antigas caem no filtro por janela de horário
    const vendasTurno = vendas.filter((v) => {
        if (v.caixaId != null) return v.caixaId === caixa.id;
        const dv = new Date(v.dataHora).getTime();
        return dv >= abertura.getTime() && dv <= fimMs;
    });

    let dinheiro = 0, cartao = 0, pix = 0;
    vendasTurno.forEach((v) => {
        const f = v.formaPagamento || "DINHEIRO";
        if (f === "DINHEIRO") dinheiro += v.valorTotal;
        else if (f === "CREDITO" || f === "DEBITO") cartao += v.valorTotal;
        else if (f === "PIX") pix += v.valorTotal;
    });

    return { abertura, fechamento, vendasTurno, dinheiro, cartao, pix, total: dinheiro + cartao + pix };
}

function renderizarTurnos(caixas, vendas) {
    const container = document.getElementById("secao-turnos");
    const corpo     = document.getElementById("turnos-corpo");

    if (!caixas || caixas.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    corpo.innerHTML = "";

    // Agrupa caixas por dia
    const porDia = {};
    caixas.forEach((c) => {
        const dia = c.dataAbertura.split("T")[0];
        if (!porDia[dia]) porDia[dia] = [];
        porDia[dia].push(c);
    });

    Object.keys(porDia).sort().forEach((dia) => {
        const caixasDoDia = porDia[dia];
        const diaFormatado = new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", {
            weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
        });

        let htmlTurnos = "";

        caixasDoDia.forEach((caixa, idx) => {
            const { abertura, fechamento, vendasTurno, dinheiro, cartao, pix, total: totalTurno } =
                calcularMetricasTurno(caixa, vendas);
            const horaAb  = abertura.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const horaFch = fechamento ? fechamento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "em aberto";
            const statusBadge = caixa.status === "ABERTO"
                ? '<span class="turno-badge turno-aberto">Em andamento</span>'
                : '<span class="turno-badge turno-fechado">Fechado</span>';

            // Detalhes do fechamento (só pra caixas fechados)
            let fechamentoHTML = "";
            if (caixa.status === "FECHADO") {
                // Recargas pagas no cartão/PIX constam na máquina mas não entram na gaveta
                const recargasGaveta = Math.max((caixa.totalRecargas || 0) - (caixa.recargasCartao || 0), 0);
                const esperado = caixa.valorInicial + dinheiro
                    - (caixa.totalSangrias || 0)
                    + (caixa.totalSuprimentos || 0)
                    + recargasGaveta;
                const diferenca = (caixa.valorContado || 0) - esperado;
                const classeDif = diferenca === 0 ? "" : diferenca > 0 ? "turno-positivo" : "turno-negativo";

                fechamentoHTML = `
                    <div class="turno-fechamento">
                        <div class="turno-fch-linha"><span>Valor inicial:</span> <span>R$ ${caixa.valorInicial.toFixed(2)}</span></div>
                        <div class="turno-fch-linha"><span>Sangrias:</span> <span>R$ ${(caixa.totalSangrias || 0).toFixed(2)}</span></div>
                        <div class="turno-fch-linha"><span>Suprimentos:</span> <span>R$ ${(caixa.totalSuprimentos || 0).toFixed(2)}</span></div>
                        <div class="turno-fch-linha"><span>Recargas na gaveta:</span> <span>R$ ${recargasGaveta.toFixed(2)}</span></div>
                        <div class="turno-fch-linha"><span>Valor contado:</span> <span>R$ ${(caixa.valorContado || 0).toFixed(2)}</span></div>
                        <div class="turno-fch-linha"><span>Esperado:</span> <span class="turno-valor-destaque">R$ ${esperado.toFixed(2)}</span></div>
                        <div class="turno-fch-linha"><span>Diferença:</span> <span class="${classeDif}">R$ ${diferenca.toFixed(2)}</span></div>
                    </div>
                `;
            }

            htmlTurnos += `
                <div class="turno-card">
                    <div class="turno-header">
                        <div>
                            <strong>Turno ${idx + 1}</strong> — ${caixa.operador}
                            ${statusBadge}
                        </div>
                        <span class="turno-horario">${horaAb} → ${horaFch}</span>
                    </div>
                    <div class="turno-metricas">
                        <div class="turno-metrica">
                            <span class="turno-metrica-label">Vendas</span>
                            <span class="turno-metrica-valor">${vendasTurno.length}</span>
                        </div>
                        <div class="turno-metrica">
                            <span class="turno-metrica-label">Faturamento</span>
                            <span class="turno-metrica-valor turno-valor-destaque">R$ ${totalTurno.toFixed(2)}</span>
                        </div>
                        <div class="turno-metrica">
                            <span class="turno-metrica-label">💵 Dinheiro</span>
                            <span class="turno-metrica-valor">R$ ${dinheiro.toFixed(2)}</span>
                        </div>
                        <div class="turno-metrica">
                            <span class="turno-metrica-label">💳 Cartão</span>
                            <span class="turno-metrica-valor">R$ ${cartao.toFixed(2)}</span>
                        </div>
                        <div class="turno-metrica">
                            <span class="turno-metrica-label">📱 PIX</span>
                            <span class="turno-metrica-valor">R$ ${pix.toFixed(2)}</span>
                        </div>
                    </div>
                    ${fechamentoHTML}
                </div>
            `;
        });

        corpo.innerHTML += `
            <div class="turno-dia">
                <div class="turno-dia-header">${diaFormatado}</div>
                ${htmlTurnos}
            </div>
        `;
    });
}

// =============================================================================
// GRÁFICO DE HORÁRIOS DE PICO
// =============================================================================

function agruparPorHora(vendas) {
    const porHora = {};

    // Inicializa todas as horas de 6h às 22h
    for (let h = 6; h <= 22; h++) {
        porHora[h] = { qtd: 0, valor: 0 };
    }

    vendas.forEach((v) => {
        if (!v.dataHora) return;
        const hora = new Date(v.dataHora).getHours();
        if (!porHora[hora]) porHora[hora] = { qtd: 0, valor: 0 };
        porHora[hora].qtd   += 1;
        porHora[hora].valor += v.valorTotal;
    });

    return porHora;
}

function renderizarGraficoHorarios(vendas) {
    const container = document.getElementById("grafico-horarios");
    container.innerHTML = "";

    if (vendas.length === 0) {
        container.innerHTML = '<p class="grafico-vazio">Sem dados para exibir.</p>';
        return;
    }

    const porHora = agruparPorHora(vendas);
    const maxQtd  = Math.max(...Object.values(porHora).map((d) => d.qtd), 1);

    Object.entries(porHora)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([hora, dados]) => {
            const pct     = (dados.qtd / maxQtd) * 100;
            const horaStr = `${String(hora).padStart(2, "0")}h`;
            const ehPico  = dados.qtd === maxQtd && dados.qtd > 0;

            container.innerHTML += `
                <div class="hora-coluna">
                    <span class="hora-qtd">${dados.qtd > 0 ? dados.qtd : ""}</span>
                    <div class="hora-barra-wrapper">
                        <div class="hora-barra ${ehPico ? "hora-barra-pico" : ""}" style="height: ${Math.max(pct, 2)}%;"></div>
                    </div>
                    <span class="hora-label">${horaStr}</span>
                </div>
            `;
        });
}

// =============================================================================
// GRÁFICO POR DIA DA SEMANA
// =============================================================================

function renderizarGraficoDiasSemana(vendas) {
    const container = document.getElementById("grafico-dias-semana");
    container.innerHTML = "";

    if (vendas.length === 0) {
        container.innerHTML = '<p class="grafico-vazio">Sem dados para exibir.</p>';
        return;
    }

    const diasNomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const porDia = [0, 0, 0, 0, 0, 0, 0]; // índice 0 = domingo

    vendas.forEach((v) => {
        if (!v.dataHora) return;
        const dia = new Date(v.dataHora).getDay();
        porDia[dia]++;
    });

    const maxQtd = Math.max(...porDia, 1);

    // Reordena pra começar na segunda (1,2,3,4,5,6,0)
    const ordem = [1, 2, 3, 4, 5, 6, 0];

    ordem.forEach((idx) => {
        const qtd   = porDia[idx];
        const pct   = (qtd / maxQtd) * 100;
        const ehMax = qtd === maxQtd && qtd > 0;

        container.innerHTML += `
            <div class="hora-coluna dia-coluna">
                <span class="hora-qtd">${qtd > 0 ? qtd : ""}</span>
                <div class="hora-barra-wrapper">
                    <div class="hora-barra ${ehMax ? "hora-barra-pico" : ""}" style="height: ${Math.max(pct, 2)}%;"></div>
                </div>
                <span class="hora-label">${diasNomes[idx]}</span>
            </div>
        `;
    });
}

// =============================================================================
// RANKING DE PRODUTOS
// =============================================================================

function renderizarRanking(vendas) {
    vendasParaRanking = vendas;
    calcularERenderizarRanking(vendas);
}

function calcularERenderizarRanking(vendas) {
    // Agrega por produto
    const porProduto = {};
    vendas.forEach((v) => {
        if (!v.itens) return;
        v.itens.forEach((item) => {
            const nome = item.produto.nome;
            if (!porProduto[nome]) porProduto[nome] = { nome, qtd: 0, faturamento: 0 };
            porProduto[nome].qtd         += item.quantidade;
            porProduto[nome].faturamento += item.precoUnitario * item.quantidade;
        });
    });

    dadosRankingAtual = Object.values(porProduto);
    ordenarEExibirRanking();
}

function ordenarRanking(coluna) {
    if (colunaRanking === coluna) {
        ordemRankingAsc = !ordemRankingAsc;
    } else {
        colunaRanking = coluna;
        ordemRankingAsc = coluna === "nome"; // nome começa A-Z, números começam maior-menor
    }

    ["nome", "qtd", "faturamento"].forEach((c) => {
        const el = document.getElementById(`seta-rank-${c}`);
        if (el) el.innerText = c === colunaRanking ? (ordemRankingAsc ? "▲" : "▼") : "";
    });

    ordenarEExibirRanking();
}

function ordenarEExibirRanking() {
    dadosRankingAtual.sort((a, b) => {
        const va = a[colunaRanking];
        const vb = b[colunaRanking];
        if (typeof va === "string") return ordemRankingAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        return ordemRankingAsc ? va - vb : vb - va;
    });

    const tbody = document.getElementById("tabela-ranking");
    tbody.innerHTML = "";

    if (dadosRankingAtual.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="td-vazio">Sem dados.</td></tr>`;
        return;
    }

    dadosRankingAtual.forEach((item, index) => {
        const posClasse = index < 3 ? `pos-${index + 1}` : "pos-default";
        tbody.innerHTML += `
            <tr>
                <td class="td-centro"><span class="ranking-badge ${posClasse}">${index + 1}°</span></td>
                <td class="td-nome">${item.nome}</td>
                <td>${item.qtd} un</td>
                <td class="td-valor">R$ ${item.faturamento.toFixed(2)}</td>
            </tr>
        `;
    });
}

async function recalcularRankingPorPeriodo() {
    const filtro = document.getElementById("filtro-periodo-ranking").value;
    const hoje   = new Date();
    let inicio, fim;

    if (filtro === "periodo") {
        // Usa as vendas já carregadas do período selecionado
        calcularERenderizarRanking(vendasParaRanking);
        return;
    }

    if (filtro === "dia") {
        inicio = hoje.toISOString().split("T")[0];
        fim    = inicio;
    } else if (filtro === "mes") {
        inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
        fim    = hoje.toISOString().split("T")[0];
    } else if (filtro === "semestre") {
        const semi = new Date(hoje); semi.setMonth(semi.getMonth() - 6);
        inicio = semi.toISOString().split("T")[0];
        fim    = hoje.toISOString().split("T")[0];
    } else if (filtro === "ano") {
        inicio = `${hoje.getFullYear()}-01-01`;
        fim    = hoje.toISOString().split("T")[0];
    }

    try {
        const vendas = await fetch(`${API_VENDAS_PERIODO}?inicio=${inicio}&fim=${fim}`).then((r) => r.json());
        calcularERenderizarRanking(vendas);
    } catch (erro) {
        console.error("Erro ao buscar vendas para ranking:", erro);
    }
}

// =============================================================================
// HISTÓRICO DETALHADO
// =============================================================================

function renderizarHistorico(vendas) {
    const tbody     = document.getElementById("tabela-historico-detalhado");
    tbody.innerHTML = "";

    if (vendas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="td-vazio">Nenhuma venda nesse período.</td></tr>`;
        document.getElementById("total-vendas-qtd").innerText    = 0;
        document.getElementById("total-faturado-valor").innerText = "R$ 0,00";
        return;
    }

    [...vendas].reverse().forEach((v) => {
        const dataFormatada = new Date(v.dataHora).toLocaleString("pt-BR");
        const textoItens    = v.itens
            ? v.itens.map((i) => `${i.quantidade}x ${i.descricao || i.produto.nome}`).join(", ")
            : "Sem detalhes";

        const forma     = v.formaPagamento || "DINHEIRO";
        const formaText = FORMA_LABELS[forma] || forma;
        const badgeClass = `badge-pgto badge-${forma.toLowerCase()}`;

        tbody.innerHTML += `
            <tr>
                <td>#${v.id}</td>
                <td>${dataFormatada}</td>
                <td class="td-itens">${textoItens}</td>
                <td><span class="${badgeClass}">${formaText}</span></td>
                <td class="td-valor">R$ ${v.valorTotal.toFixed(2)}</td>
            </tr>
        `;
    });
}

// =============================================================================
// EXPORTAR PDF
// =============================================================================

function exportarParaPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const ML = 14;            // margem esquerda
    const MR = 14;            // margem direita
    const CW = W - ML - MR;  // largura util
    let y = 14;               // cursor vertical

    const CINZA   = [60, 60, 60];    // rótulos — bem mais escuro p/ leitura no celular
    const PRETO   = [0, 0, 0];       // valores — preto puro
    const CLARO   = [170, 170, 170]; // bordas/linhas finas
    const RODAPE  = [110, 110, 110]; // rodapé (antes era quase invisível)
    const BG_HEAD = [225, 225, 225];
    const BG_ALT  = [245, 245, 245];
    const VERDE   = [12, 130, 60];
    const VERM    = [200, 40, 40];

    function checarPagina(necessario) {
        if (y + necessario > H - 16) {
            doc.addPage();
            y = 14;
        }
    }

    function rodape() {
        const n = doc.internal.getNumberOfPages();
        for (let i = 1; i <= n; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(...RODAPE);
            doc.text(`Unicka Digital PDV  -  Pagina ${i} de ${n}`, W / 2, H - 6, { align: "center" });
        }
    }

    function secaoTitulo(titulo) {
        checarPagina(16);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...CINZA);
        doc.text(titulo.toUpperCase(), ML, y);
        y += 1.5;
        doc.setDrawColor(...CLARO);
        doc.line(ML, y, ML + CW, y);
        y += 6;
    }

    // =======================================================================
    // COLETA DE DADOS
    // =======================================================================

    const txt = (id) => (document.getElementById(id)?.innerText || "-").trim();

    const periodo    = txt("periodo-selecionado");
    const qtdVendas  = txt("total-vendas-qtd");
    const faturado   = txt("total-faturado-valor");
    const ticket     = txt("ticket-medio");
    const pico       = txt("horario-pico");
    const pgDinheiro = txt("pgto-dinheiro");
    const pgCredito  = txt("pgto-credito");
    const pgDebito   = txt("pgto-debito");
    const pgPix      = txt("pgto-pix");

    const agora       = new Date().toLocaleString("pt-BR");
    const dataArquivo = new Date().toISOString().split("T")[0];

    // =======================================================================
    // CABECALHO
    // =======================================================================

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRETO);
    doc.text("Unicka Digital", ML, y);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CINZA);
    doc.text(periodo, W - MR, y - 4, { align: "right" });
    doc.text(`Gerado em: ${agora}`, W - MR, y, { align: "right" });

    y += 4;
    doc.setFontSize(14);
    doc.setTextColor(...CINZA);
    doc.text("Relatorio de Vendas", ML, y);
    y += 3;
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.5);
    doc.line(ML, y, ML + CW, y);
    doc.setLineWidth(0.2);
    y += 8;

    // =======================================================================
    // CARDS - RESUMO GERAL
    // =======================================================================

    function desenharCards(titulo, items) {
        secaoTitulo(titulo);
        const cardW = (CW - 6) / 4;
        const cardH = 21;
        checarPagina(cardH + 4);

        items.forEach((item, i) => {
            const x = ML + i * (cardW + 2);
            doc.setDrawColor(...CLARO);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, cardW, cardH, 1, 1, "S");

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...CINZA);
            doc.text(item.label.toUpperCase(), x + 3, y + 7);

            doc.setFontSize(15);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...PRETO);
            doc.text(item.valor, x + 3, y + 15);
        });

        y += cardH + 6;
    }

    desenharCards("Resumo Geral", [
        { label: "Total de Vendas", valor: qtdVendas },
        { label: "Faturamento",     valor: faturado },
        { label: "Ticket Medio",    valor: ticket },
        { label: "Horario de Pico", valor: pico },
    ]);

    desenharCards("Formas de Pagamento", [
        { label: "Dinheiro", valor: pgDinheiro },
        { label: "Credito",  valor: pgCredito },
        { label: "Debito",   valor: pgDebito },
        { label: "PIX",      valor: pgPix },
    ]);

    // =======================================================================
    // TABELA GENERICA
    // =======================================================================

    function desenharTabela(titulo, colunas, linhas) {
        secaoTitulo(titulo);

        const lineH = 8;

        // cabecalho
        checarPagina(lineH * 2);
        doc.setFillColor(...BG_HEAD);
        doc.rect(ML, y, CW, lineH, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);

        let cx = ML;
        colunas.forEach((col) => {
            const align = col.align || "left";
            const tx = align === "right" ? cx + col.w - 2 : align === "center" ? cx + col.w / 2 : cx + 2;
            doc.text(col.label, tx, y + 5.5, { align });
            cx += col.w;
        });
        y += lineH;

        // linhas
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);

        linhas.forEach((linha, idx) => {
            checarPagina(lineH);
            if (idx % 2 === 1) {
                doc.setFillColor(...BG_ALT);
                doc.rect(ML, y, CW, lineH, "F");
            }

            doc.setTextColor(...PRETO);
            cx = ML;
            linha.forEach((celula, ci) => {
                const col   = colunas[ci];
                const align = col.align || "left";
                const tx    = align === "right" ? cx + col.w - 2 : align === "center" ? cx + col.w / 2 : cx + 2;
                const texto = String(celula);
                const maxW  = col.w - 4;
                const cortado = doc.getStringUnitWidth(texto) * 11 / doc.internal.scaleFactor > maxW
                    ? texto.substring(0, Math.max(1, Math.floor(maxW / 2.4))) + "..."
                    : texto;
                doc.text(cortado, tx, y + 5.5, { align });
                cx += col.w;
            });
            y += lineH;
        });

        y += 4;
    }

    // =======================================================================
    // VENDAS POR HORARIO
    // =======================================================================

    const colunasHora = document.querySelectorAll("#grafico-horarios .hora-coluna");
    if (colunasHora.length > 0) {
        const linhasH = [...colunasHora]
            .map((col) => {
                const label = col.querySelector(".hora-label")?.innerText || "";
                const qtd   = col.querySelector(".hora-qtd")?.innerText  || "0";
                return [label, qtd || "0"];
            })
            .filter(([, q]) => q !== "0");

        if (linhasH.length > 0) {
            desenharTabela("Vendas por Horario", [
                { label: "HORARIO",     w: CW * 0.5 },
                { label: "QTD. VENDAS", w: CW * 0.5, align: "center" },
            ], linhasH);
        }
    }

    // =======================================================================
    // VENDAS POR DIA DA SEMANA
    // =======================================================================

    const colunasDia = document.querySelectorAll("#grafico-dias-semana .hora-coluna");
    if (colunasDia.length > 0) {
        const linhasD = [...colunasDia].map((col) => {
            const label = col.querySelector(".hora-label")?.innerText || "";
            const qtd   = col.querySelector(".hora-qtd")?.innerText  || "0";
            return [label, qtd || "0"];
        });

        desenharTabela("Vendas por Dia da Semana", [
            { label: "DIA",         w: CW * 0.5 },
            { label: "QTD. VENDAS", w: CW * 0.5, align: "center" },
        ], linhasD);
    }

    // =======================================================================
    // TURNOS
    // =======================================================================

    if (caixasAtuais.length > 0) {
        secaoTitulo("Resumo por Turnos");

        const lineH = 8;
        const colsTurno = [
            { label: "TURNO / OPERADOR", w: CW * 0.28 },
            { label: "HORARIO",          w: CW * 0.15, align: "center" },
            { label: "VENDAS",           w: CW * 0.09, align: "center" },
            { label: "DINHEIRO",         w: CW * 0.12, align: "right" },
            { label: "CARTAO",           w: CW * 0.12, align: "right" },
            { label: "PIX",              w: CW * 0.12, align: "right" },
            { label: "TOTAL",            w: CW * 0.12, align: "right" },
        ];

        function cabecalhoTurnos() {
            doc.setFillColor(...BG_HEAD);
            doc.rect(ML, y, CW, lineH, "F");
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            let cx = ML;
            colsTurno.forEach((col) => {
                const align = col.align || "left";
                const tx = align === "right" ? cx + col.w - 2 : align === "center" ? cx + col.w / 2 : cx + 2;
                doc.text(col.label, tx, y + 5.5, { align });
                cx += col.w;
            });
            y += lineH;
        }

        // Agrupa caixas por dia (mesma lógica da tela)
        const caixasPorDia = {};
        caixasAtuais.forEach((c) => {
            const dia = c.dataAbertura.split("T")[0];
            if (!caixasPorDia[dia]) caixasPorDia[dia] = [];
            caixasPorDia[dia].push(c);
        });

        checarPagina(lineH * 3);
        cabecalhoTurnos();

        const hhmm = (d) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        let turnoAltIdx = 0;

        Object.keys(caixasPorDia).sort().forEach((dia) => {
            const dataBr = new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
            });
            const tituloDia = dataBr.charAt(0).toUpperCase() + dataBr.slice(1);

            checarPagina(lineH * 2);
            doc.setFillColor(215, 215, 215);
            doc.rect(ML, y, CW, lineH, "F");
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            doc.text(tituloDia, ML + 2, y + 5.5);
            y += lineH;
            turnoAltIdx = 0;

            caixasPorDia[dia].forEach((caixa, idx) => {
                const m = calcularMetricasTurno(caixa, vendasAtuais);
                const horario = `${hhmm(m.abertura)} - ${m.fechamento ? hhmm(m.fechamento) : "aberto"}`;
                const status  = caixa.status === "ABERTO" ? " (em andamento)" : "";
                const linha = [
                    `Turno ${idx + 1} - ${caixa.operador}${status}`,
                    horario,
                    String(m.vendasTurno.length),
                    `R$ ${m.dinheiro.toFixed(2)}`,
                    `R$ ${m.cartao.toFixed(2)}`,
                    `R$ ${m.pix.toFixed(2)}`,
                    `R$ ${m.total.toFixed(2)}`,
                ];

                checarPagina(lineH);
                if (turnoAltIdx % 2 === 1) {
                    doc.setFillColor(...BG_ALT);
                    doc.rect(ML, y, CW, lineH, "F");
                }

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(...PRETO);
                let cx = ML;
                linha.forEach((celula, ci) => {
                    const col   = colsTurno[ci];
                    const align = col.align || "left";
                    const tx    = align === "right" ? cx + col.w - 2 : align === "center" ? cx + col.w / 2 : cx + 2;
                    const maxW  = col.w - 4;
                    let texto   = String(celula);
                    if (doc.getStringUnitWidth(texto) * 10 / doc.internal.scaleFactor > maxW) {
                        texto = texto.substring(0, Math.max(1, Math.floor(maxW / 2.4))) + "...";
                    }
                    doc.text(texto, tx, y + 5.5, { align });
                    cx += col.w;
                });
                y += lineH;
                turnoAltIdx++;

                // Linha de fechamento (só caixas fechados)
                if (caixa.status === "FECHADO") {
                    const recargasGaveta = Math.max((caixa.totalRecargas || 0) - (caixa.recargasCartao || 0), 0);
                    const esperado = caixa.valorInicial + m.dinheiro
                        - (caixa.totalSangrias || 0)
                        + (caixa.totalSuprimentos || 0)
                        + recargasGaveta;
                    const diferenca = (caixa.valorContado || 0) - esperado;

                    checarPagina(14);
                    doc.setFontSize(8.5);
                    doc.setFont("helvetica", "italic");
                    doc.setTextColor(...CINZA);
                    doc.text(
                        `Inicial: R$ ${caixa.valorInicial.toFixed(2)}    |    ` +
                        `Sangrias: R$ ${(caixa.totalSangrias || 0).toFixed(2)}    |    ` +
                        `Suprimentos: R$ ${(caixa.totalSuprimentos || 0).toFixed(2)}    |    ` +
                        `Recargas na gaveta: R$ ${recargasGaveta.toFixed(2)}`,
                        ML + 4, y + 4);
                    y += 5.5;

                    const textoConf =
                        `Contado: R$ ${(caixa.valorContado || 0).toFixed(2)}    |    ` +
                        `Esperado: R$ ${esperado.toFixed(2)}    |    Diferenca:`;
                    doc.text(textoConf, ML + 4, y + 4);
                    const wConf = doc.getStringUnitWidth(textoConf) * 8.5 / doc.internal.scaleFactor;
                    doc.setFont("helvetica", "bold");
                    if (diferenca > 0)      doc.setTextColor(...VERDE);
                    else if (diferenca < 0) doc.setTextColor(...VERM);
                    doc.text(` R$ ${diferenca.toFixed(2)}`, ML + 4 + wConf, y + 4);

                    y += 6.5;
                    turnoAltIdx++;
                }
            });
        });

        y += 4;
    }

    // =======================================================================
    // RANKING DE PRODUTOS
    // =======================================================================

    if (dadosRankingAtual.length > 0) {
        const totalFat = dadosRankingAtual.reduce((s, i) => s + i.faturamento, 0);
        const linhasR = dadosRankingAtual.map((item, idx) => {
            const pct = totalFat > 0 ? ((item.faturamento / totalFat) * 100).toFixed(1) + "%" : "0%";
            return [`${idx + 1}`, item.nome, `${item.qtd} un`, `R$ ${item.faturamento.toFixed(2)}`, pct];
        });

        desenharTabela("Ranking de Produtos", [
            { label: "#",          w: CW * 0.07, align: "center" },
            { label: "PRODUTO",    w: CW * 0.38 },
            { label: "QTD.",       w: CW * 0.13, align: "center" },
            { label: "FATURAMENTO",w: CW * 0.24 },
            { label: "% TOTAL",    w: CW * 0.18, align: "center" },
        ], linhasR);
    }

    // =======================================================================
    // HISTORICO DETALHADO
    // =======================================================================

    if (vendasAtuais.length > 0) {
        const FORMA_PDF = { DINHEIRO: "Dinheiro", CREDITO: "Credito", DEBITO: "Debito", PIX: "PIX" };

        const porDia = {};
        vendasAtuais.forEach(v => {
            const dia = v.dataHora ? v.dataHora.split("T")[0] : "sem-data";
            if (!porDia[dia]) porDia[dia] = [];
            porDia[dia].push(v);
        });

        secaoTitulo("Historico Detalhado de Vendas");

        const colsHist = [
            { label: "ID",        w: CW * 0.10 },
            { label: "HORA",      w: CW * 0.12 },
            { label: "ITENS",     w: CW * 0.40 },
            { label: "PGTO",      w: CW * 0.16 },
            { label: "VALOR",     w: CW * 0.22, align: "right" },
        ];

        // cabecalho da tabela
        const lineH = 8;
        checarPagina(lineH);
        doc.setFillColor(...BG_HEAD);
        doc.rect(ML, y, CW, lineH, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        let hx = ML;
        colsHist.forEach(col => {
            const align = col.align || "left";
            const tx = align === "right" ? hx + col.w - 2 : hx + 2;
            doc.text(col.label, tx, y + 5.5, { align });
            hx += col.w;
        });
        y += lineH;

        let altIdx = 0;

        Object.keys(porDia).sort((a, b) => b.localeCompare(a)).forEach(dia => {
            const dataBr = dia !== "sem-data"
                ? new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
                  })
                : "Sem data";
            const subtotal = porDia[dia].reduce((s, v) => s + v.valorTotal, 0);
            const titulo   = dataBr.charAt(0).toUpperCase() + dataBr.slice(1);

            // barra de dia
            checarPagina(lineH);
            doc.setFillColor(215, 215, 215);
            doc.rect(ML, y, CW, lineH, "F");
            doc.setFontSize(9.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            doc.text(`${titulo}  -  R$ ${subtotal.toFixed(2)}`, ML + 2, y + 5.5);
            y += lineH;
            altIdx = 0;

            porDia[dia].forEach(v => {
                checarPagina(lineH);
                if (altIdx % 2 === 1) {
                    doc.setFillColor(...BG_ALT);
                    doc.rect(ML, y, CW, lineH, "F");
                }

                const hora  = v.dataHora
                    ? new Date(v.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : "-";
                const itens = (v.itens || []).map(i => `${i.quantidade}x ${i.descricao || i.produto?.nome || "?"}`).join(", ") || "-";
                const forma = FORMA_PDF[v.formaPagamento] || v.formaPagamento || "-";
                const dados = [`#${v.id}`, hora, itens, forma, `R$ ${v.valorTotal.toFixed(2)}`];

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(...PRETO);

                let rx = ML;
                dados.forEach((celula, ci) => {
                    const col   = colsHist[ci];
                    const align = col.align || "left";
                    const tx    = align === "right" ? rx + col.w - 2 : rx + 2;
                    const maxW  = col.w - 4;
                    let texto   = String(celula);
                    if (doc.getStringUnitWidth(texto) * 10 / doc.internal.scaleFactor > maxW) {
                        texto = texto.substring(0, Math.max(1, Math.floor(maxW / 2.4))) + "...";
                    }
                    doc.text(texto, tx, y + 5.5, { align });
                    rx += col.w;
                });
                y += lineH;
                altIdx++;
            });
        });

        y += 4;
    }

    // =======================================================================
    // RODAPE
    // =======================================================================

    checarPagina(10);
    doc.setDrawColor(...CLARO);
    doc.line(ML, y, ML + CW, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(...RODAPE);
    doc.text("Unicka Digital PDV - Documento gerado automaticamente", W / 2, y, { align: "center" });

    rodape();
    doc.save(`relatorio-unicka-${dataArquivo}.pdf`);
}
// =============================================================================
// PEGUE E MONTE (LOCAÇÕES POR MÊS)
// =============================================================================

function inicializarPegueMonte() {
    // Mês atual como padrão (formato YYYY-MM do input type=month)
    const hoje = new Date();
    const mes  = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    document.getElementById("mes-pegue-monte").value = mes;
    carregarPegueMonte();
}

async function carregarPegueMonte() {
    const mes = document.getElementById("mes-pegue-monte").value;
    if (!mes) return;

    // Primeiro e último dia do mês selecionado
    const [ano, mesNum] = mes.split("-").map(Number);
    const inicio = `${mes}-01`;
    const fim    = `${mes}-${String(new Date(ano, mesNum, 0).getDate()).padStart(2, "0")}`;

    try {
        const locacoes = await fetch(`${API_LOCACOES_PERIODO}?inicio=${inicio}&fim=${fim}`).then((r) => r.json());

        const ativas     = locacoes.filter((l) => l.status !== "CANCELADO");
        const canceladas = locacoes.length - ativas.length;
        const valorTotal = ativas.reduce((acc, l) => acc + (l.valor || 0), 0);

        // Ranking de temas
        const porTema = {};
        ativas.forEach((l) => {
            const tema = l.tema || "(sem tema)";
            porTema[tema] = (porTema[tema] || 0) + 1;
        });
        const temaTop = Object.entries(porTema).sort((a, b) => b[1] - a[1])[0];

        document.getElementById("pm-qtd").innerText      = ativas.length;
        document.getElementById("pm-valor").innerText    = `R$ ${valorTotal.toFixed(2)}`;
        document.getElementById("pm-tema-top").innerText = temaTop ? `${temaTop[0]} (${temaTop[1]}x)` : "—";
        document.getElementById("pm-subtitulo").innerText = canceladas > 0
            ? `${canceladas} locação(ões) cancelada(s) no mês — fora dos totais`
            : "Locações do mês selecionado";

        const STATUS_LABEL = { RESERVADO: "Reservado", ENTREGUE: "Entregue", DEVOLVIDO: "Devolvido", CANCELADO: "Cancelado" };
        const tbody = document.getElementById("pm-tabela");
        tbody.innerHTML = "";

        if (locacoes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Nenhuma locação neste mês.</td></tr>`;
            return;
        }

        locacoes
            .sort((a, b) => (a.dataEvento || "").localeCompare(b.dataEvento || ""))
            .forEach((l) => {
                const cancelada = l.status === "CANCELADO";
                const dataEvt   = l.dataEvento ? new Date(l.dataEvento + "T12:00:00").toLocaleDateString("pt-BR") : "-";
                tbody.innerHTML += `
                    <tr style="${cancelada ? "opacity: 0.45; text-decoration: line-through;" : ""}">
                        <td>${l.tema || "-"}</td>
                        <td>${l.cliente?.nome || "-"}</td>
                        <td>${dataEvt}</td>
                        <td>${FORMA_LABELS[l.formaPagamento] || l.formaPagamento || "-"}</td>
                        <td>${STATUS_LABEL[l.status] || l.status || "-"}</td>
                        <td class="td-valor">R$ ${(l.valor || 0).toFixed(2)}</td>
                    </tr>`;
            });

    } catch (erro) {
        console.error("Erro ao carregar pegue e monte:", erro);
        if (typeof showToast === "function") {
            showToast("Erro ao carregar as locações do mês.", "erro");
        }
    }
}
