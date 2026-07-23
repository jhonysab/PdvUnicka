// =============================================================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// =============================================================================

const API_URL = "http://localhost:8080/api/produtos";

let todosProdutos     = [];
let produtosFiltrados = [];

let paginaAtual      = 1;
let colunaOrdenacao  = "id";
let ordemAscendente  = true;
let formularioAberto = false;

const ITENS_POR_PAGINA = 5;

const _perfil = sessionStorage.getItem("perfil");
if (!_perfil) window.location.href = "index.html";

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

buscarProdutosDoBanco();
carregarAlertas();

// =============================================================================
// BUSCA INTELIGENTE DE FORNECEDOR
// =============================================================================

function sugerirFornecedor() {
    const input   = document.getElementById("fornecedorNome");
    const caixa   = document.getElementById("sugestoes-fornecedor");
    const termo   = input.value.trim().toLowerCase();

    if (!termo) { caixa.style.display = "none"; return; }

    // Coleta nomes únicos de fornecedores já cadastrados
    const nomes = [...new Set(
        todosProdutos
            .map(p => p.fornecedorNome)
            .filter(n => n && n.trim())
    )];

    const matches = nomes.filter(n => n.toLowerCase().includes(termo));

    if (!matches.length) { caixa.style.display = "none"; return; }

    caixa.innerHTML = matches.map(n => {
        // Encontra um produto deste fornecedor para exibir info extra
        const ref = todosProdutos.find(p => p.fornecedorNome && p.fornecedorNome.trim() === n.trim());
        const sub = ref && ref.fornecedorTelefone ? ref.fornecedorTelefone : "";
        return `<div class="item-sugestao" onclick="selecionarFornecedor('${n.replace(/'/g, "\\'")}')">
            <strong>${n}</strong>${sub ? `<small>${sub}</small>` : ""}
        </div>`;
    }).join("");
    caixa.style.display = "block";
}

function selecionarFornecedor(nome) {
    document.getElementById("fornecedorNome").value = nome;
    document.getElementById("sugestoes-fornecedor").style.display = "none";

    // Preenche telefone, endereço e pagamento automaticamente se disponível
    const ref = todosProdutos.find(
        p => p.fornecedorNome && p.fornecedorNome.trim() === nome.trim()
    );
    if (ref) {
        if (ref.fornecedorTelefone)  document.getElementById("fornecedorTelefone").value  = ref.fornecedorTelefone;
        if (ref.fornecedorEndereco)  document.getElementById("fornecedorEndereco").value   = ref.fornecedorEndereco;
        if (ref.fornecedorPagamento) document.getElementById("fornecedorPagamento").value  = ref.fornecedorPagamento;
    }
}

document.addEventListener("click", function (e) {
    const caixa = document.getElementById("sugestoes-fornecedor");
    if (caixa && !caixa.contains(e.target) && e.target.id !== "fornecedorNome") {
        caixa.style.display = "none";
    }
});

// =============================================================================
// FORMULÁRIO — COLAPSO/EXPANSÃO
// =============================================================================

function toggleFormulario() {
    formularioAberto = !formularioAberto;
    const campos = document.getElementById("campos-expandidos");
    const btn    = document.getElementById("btn-toggle-form");

    campos.classList.toggle("aberto", formularioAberto);
    btn.innerText = formularioAberto ? "▲ Recolher campos" : "▼ Expandir campos";
}

// =============================================================================
// CÁLCULO DE MARGEM EM TEMPO REAL
// =============================================================================

function calcularMargem() {
    const preco = parseFloat(document.getElementById("preco").value)       || 0;
    const custo = parseFloat(document.getElementById("custoCompra").value) || 0;
    const el    = document.getElementById("margem-valor");
    const box   = document.getElementById("margem-display");

    if (preco <= 0 || custo <= 0) {
        el.innerText  = "—";
        box.className = "margem-display";
        return;
    }

    const margem  = ((preco - custo) / custo) * 100;
    el.innerText  = `${margem.toFixed(1)}%`;
    box.className = "margem-display " + (
        margem >= 30 ? "margem-boa"   :
            margem >= 10 ? "margem-media" :
                "margem-baixa"
    );
}

// =============================================================================
// ALERTAS DE ESTOQUE MÍNIMO
// =============================================================================

async function carregarAlertas() {
    try {
        const resposta = await fetch(`${API_URL}/alertas`);
        if (!resposta.ok) return;
        const alertas  = await resposta.json();

        const secao = document.getElementById("alertas-estoque");
        const lista = document.getElementById("alertas-lista");

        if (!alertas.length) {
            secao.style.display = "none";
            return;
        }

        lista.innerHTML = "";
        alertas.forEach((p) => {
            lista.innerHTML += `
                <div class="alerta-estoque-item">
                    <span class="alerta-estoque-nome">${p.nome}</span>
                    <span class="alerta-estoque-min">mín: ${p.estoqueMinimo}</span>
                    <span class="alerta-estoque-qtd">${p.estoque} restantes</span>
                </div>`;
        });

        secao.style.display = "block";
    } catch (e) {
        // sem alertas
    }
}

// =============================================================================
// BUSCA DE DADOS
// =============================================================================

async function buscarProdutosDoBanco() {
    try {
        const resposta = await fetch(API_URL);
        todosProdutos  = await resposta.json();
        filtrarEPaginar();
    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro);
    }
}

// =============================================================================
// FILTRO, ORDENAÇÃO E PAGINAÇÃO
// =============================================================================

function filtrarEPaginar() {
    const termo = document.getElementById("barra-pesquisa").value.toLowerCase();

    produtosFiltrados = todosProdutos.filter(
        (p) =>
            p.nome !== "VENDA AVULSA" && (
                p.nome.toLowerCase().includes(termo) ||
                (p.codigoBarras    && p.codigoBarras.toLowerCase().includes(termo))    ||
                (p.fornecedorNome  && p.fornecedorNome.toLowerCase().includes(termo))  ||
                (p.localizacao     && p.localizacao.toLowerCase().includes(termo))
            )
    );

    produtosFiltrados.sort((a, b) => {
        const valorA = a[colunaOrdenacao] ?? "";
        const valorB = b[colunaOrdenacao] ?? "";

        if (typeof valorA === "string") {
            return ordemAscendente ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
        }

        return ordemAscendente ? valorA - valorB : valorB - valorA;
    });

    const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA) || 1;
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    document.getElementById("info-paginas").innerText = `Página ${paginaAtual} de ${totalPaginas}`;

    const inicio           = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const produtosDaPagina = produtosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);

    renderizarTabela(produtosDaPagina);
}

const COLUNAS_SETA = ["id", "nome", "preco", "custoCompra", "margemLucro", "estoque", "localizacao", "dataValidade"];

function alterarOrdenacao(coluna) {
    if (colunaOrdenacao === coluna) {
        ordemAscendente = !ordemAscendente;
    } else {
        colunaOrdenacao = coluna;
        ordemAscendente = true;
    }

    COLUNAS_SETA.forEach((c) => {
        const el = document.getElementById(`seta-${c}`);
        if (el) el.innerText = c === coluna ? (ordemAscendente ? "▲" : "▼") : "";
    });

    filtrarEPaginar();
}

function paginaAnterior() {
    if (paginaAtual > 1) { paginaAtual--; filtrarEPaginar(); }
}

function proximaPagina() {
    if (paginaAtual * ITENS_POR_PAGINA < produtosFiltrados.length) { paginaAtual++; filtrarEPaginar(); }
}

// =============================================================================
// RENDERIZAÇÃO DA TABELA
// =============================================================================

function unidadeLabel(u) {
    return { UNIDADE: "un", KG: "kg", METRO: "m", LITRO: "L" }[u] || u.toLowerCase();
}

function renderizarTabela(produtos) {
    const tbody     = document.getElementById("tabela-produtos");
    tbody.innerHTML = "";

    if (produtos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; color:var(--text-dim); padding:32px;">
                    Nenhum produto encontrado.
                </td>
            </tr>`;
        return;
    }

    produtos.forEach((p) => {
        // Estoque: crítico se <= mínimo, baixo se <= 2
        const abaixoMinimo = p.estoqueMinimo != null && p.estoque <= p.estoqueMinimo;
        const classeEstoque = abaixoMinimo ? "estoque-critico" :
            p.estoque <= 2  ? "estoque-baixo"  :
            p.estoque <= 10 ? "estoque-medio"  :
                              "estoque-alto";

        // Margem
        let margemHtml = '<span style="color:var(--text-dim)">—</span>';
        if (p.custoCompra && p.custoCompra > 0 && p.preco > 0) {
            const m    = ((p.preco - p.custoCompra) / p.custoCompra) * 100;
            const cor  = m >= 30 ? "var(--green)" : m >= 10 ? "var(--yellow)" : "var(--red)";
            margemHtml = `<span style="color:${cor}; font-weight:700;">${m.toFixed(1)}%</span>`;
        }

        // Validade
        let validadeHtml = '<span style="color:var(--text-dim)">—</span>';
        if (p.dataValidade) {
            const hoje          = new Date();
            const validade      = new Date(p.dataValidade + "T12:00:00");
            const diasRestantes = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24));
            const dataStr       = validade.toLocaleDateString("pt-BR");

            if (diasRestantes < 0) {
                validadeHtml = `<span class="validade-vencida">⚠ ${dataStr}</span>`;
            } else if (diasRestantes <= 30) {
                validadeHtml = `<span class="validade-proxima">⏰ ${dataStr}</span>`;
            } else {
                validadeHtml = `<span>${dataStr}</span>`;
            }
        }

        const custoHtml = p.custoCompra
            ? `R$ ${p.custoCompra.toFixed(2)}`
            : '<span style="color:var(--text-dim)">—</span>';

        const locHtml = p.localizacao
            ? `<span class="badge-localizacao">${p.localizacao}</span>`
            : '<span style="color:var(--text-dim)">—</span>';

        const unidade = p.unidadeMedida ? unidadeLabel(p.unidadeMedida) : "un";

        tbody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>
                    <div style="font-weight:600;">${p.nome}</div>
                    ${p.modelo ? `<div style="font-size:12px; color:var(--text-dim);">${p.modelo}</div>` : ""}
                </td>
                <td>R$ ${p.preco.toFixed(2)}</td>
                <td style="color:var(--text-muted); font-size:13px;">${custoHtml}</td>
                <td>${margemHtml}</td>
                <td class="${classeEstoque}">
                    ${p.estoque} ${unidade}
                    ${p.estoqueMinimo != null ? `<br><span style="font-size:11px;color:var(--text-dim);font-weight:400;">mín:${p.estoqueMinimo}</span>` : ""}
                </td>
                <td>${locHtml}</td>
                <td style="font-size:13px;">${validadeHtml}</td>
                <td class="col-acoes">
                    <button class="btn-editar" onclick="prepararEdicao(${p.id})">Editar</button>
                    <button class="btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

// =============================================================================
// CADASTRO E EDIÇÃO
// =============================================================================

function toTitleCase(str) {
    if (!str) return str;
    return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

async function salvarProduto() {
    const id                 = document.getElementById("produtoId").value;
    const nome               = toTitleCase(document.getElementById("nome").value.trim());
    const preco              = parseFloat(document.getElementById("preco").value);
    const estoque            = parseInt(document.getElementById("estoque").value);
    const estoqueMinimo      = parseInt(document.getElementById("estoqueMinimo").value) || null;
    const codigoBarras       = document.getElementById("codigoBarras").value.trim()       || null;
    const custoCompra        = parseFloat(document.getElementById("custoCompra").value)   || null;
    const unidadeMedida      = document.getElementById("unidadeMedida").value             || null;
    const modelo             = toTitleCase(document.getElementById("modelo").value.trim()) || null;
    const fornecedorNome     = toTitleCase(document.getElementById("fornecedorNome").value.trim()) || null;
    const fornecedorTelefone = document.getElementById("fornecedorTelefone").value.trim() || null;
    const fornecedorEndereco = toTitleCase(document.getElementById("fornecedorEndereco").value.trim()) || null;
    const fornecedorPagamento = document.getElementById("fornecedorPagamento").value      || null;
    const localizacao        = toTitleCase(document.getElementById("localizacao").value.trim()) || null;
    const dataCompra         = document.getElementById("dataCompra").value                || null;
    const dataValidade       = document.getElementById("dataValidade").value              || null;

    if (!nome)                         { showToast("O nome do produto não pode ficar vazio!", "aviso"); return; }
    if (isNaN(preco)   || preco  <= 0) { showToast("O preço precisa ser maior que zero!", "aviso");    return; }
    if (isNaN(estoque) || estoque < 0) { showToast("O estoque não pode ser negativo!", "aviso");       return; }

    const margemLucro = (custoCompra && custoCompra > 0 && preco > 0)
        ? parseFloat((((preco - custoCompra) / custoCompra) * 100).toFixed(2))
        : null;

    const produtoData = {
        nome, preco, estoque, estoqueMinimo, codigoBarras,
        custoCompra, margemLucro, unidadeMedida, modelo,
        fornecedorNome, fornecedorTelefone, fornecedorEndereco, fornecedorPagamento,
        localizacao, dataCompra, dataValidade,
    };

    if (id) produtoData.id = parseInt(id);

    try {
        const resposta = await fetch(API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(produtoData),
        });

        if (resposta.ok) {
            showToast(id ? "Produto atualizado!" : "Produto cadastrado!", "sucesso");
            limparFormulario();
            await buscarProdutosDoBanco();
            carregarAlertas();
        } else {
            const erro = await resposta.text();
            showToast("Erro ao salvar: " + erro, "erro");
        }
    } catch (erro) {
        console.error("Erro ao salvar produto:", erro);
    }
}

function prepararEdicao(id) {
    const p = todosProdutos.find((x) => x.id === id);
    if (!p) return;

    document.getElementById("produtoId").value           = p.id;
    document.getElementById("nome").value                = p.nome               || "";
    document.getElementById("preco").value               = p.preco              || "";
    document.getElementById("estoque").value             = p.estoque            || "";
    document.getElementById("estoqueMinimo").value       = p.estoqueMinimo      || "";
    document.getElementById("codigoBarras").value        = p.codigoBarras       || "";
    document.getElementById("custoCompra").value         = p.custoCompra        || "";
    document.getElementById("unidadeMedida").value       = p.unidadeMedida      || "";
    document.getElementById("modelo").value              = p.modelo             || "";
    document.getElementById("fornecedorNome").value      = p.fornecedorNome     || "";
    document.getElementById("fornecedorTelefone").value  = p.fornecedorTelefone || "";
    document.getElementById("fornecedorEndereco").value  = p.fornecedorEndereco || "";
    document.getElementById("fornecedorPagamento").value = p.fornecedorPagamento || "";
    document.getElementById("localizacao").value         = p.localizacao        || "";
    document.getElementById("dataCompra").value          = p.dataCompra         || "";
    document.getElementById("dataValidade").value        = p.dataValidade       || "";

    calcularMargem();

    if (!formularioAberto) toggleFormulario();

    const btnSalvar     = document.getElementById("btn-salvar");
    btnSalvar.innerText = "Salvar Alterações";
    btnSalvar.classList.add("modo-edicao");

    document.querySelector(".secao-cadastro").scrollIntoView({ behavior: "smooth" });
}

window.prepararEdicao = prepararEdicao;

function limparFormulario() {
    [
        "produtoId", "nome", "preco", "estoque", "estoqueMinimo", "codigoBarras",
        "custoCompra", "modelo", "fornecedorNome", "fornecedorTelefone", "fornecedorEndereco",
        "localizacao", "dataCompra", "dataValidade",
    ].forEach((id) => (document.getElementById(id).value = ""));

    document.getElementById("unidadeMedida").value        = "";
    document.getElementById("fornecedorPagamento").value  = "";
    document.getElementById("margem-valor").innerText     = "—";
    document.getElementById("margem-display").className   = "margem-display";

    const btnSalvar     = document.getElementById("btn-salvar");
    btnSalvar.innerText = "Cadastrar Produto";
    btnSalvar.classList.remove("modo-edicao");
}

// =============================================================================
// EXCLUSÃO
// =============================================================================

async function excluirProduto(id) {
    if (!confirm("Tem certeza que deseja excluir este produto do estoque?")) return;

    try {
        const resposta = await fetch(`${API_URL}/${id}`, { method: "DELETE" });

        if (resposta.ok) {
            showToast("Produto removido!", "sucesso");
            await buscarProdutosDoBanco();
            carregarAlertas();
        } else {
            const msg = await resposta.text();
            showToast(msg, "erro");
        }
    } catch (erro) {
        console.error("Erro ao excluir produto:", erro);
    }
}

// =============================================================================
// LISTA DE COMPRAS / PEDIDOS DE CLIENTES
// =============================================================================

const API_COMPRAS = "http://localhost:8080/api/compras";

let itensCompra          = [];
let paginaCompras        = 1;
const COMPRAS_POR_PAGINA = 5;

carregarListaCompras();

async function carregarListaCompras() {
    const tbody = document.getElementById("tabela-compras");
    if (!tbody) return;

    try {
        const itens = await fetch(API_COMPRAS).then((r) => r.json());
        itensCompra = Array.isArray(itens) ? itens : [];

        // Pendentes primeiro, comprados no fim (riscados)
        itensCompra.sort((a, b) => (a.status === "COMPRADO") - (b.status === "COMPRADO"));

        renderComprasPagina();

    } catch (erro) {
        console.error("Erro ao carregar lista de compras:", erro);
        itensCompra = [];
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: #f87171;">Erro ao carregar a lista de compras.</td></tr>`;
        document.getElementById("info-paginas-compras").innerText = "Página 1 de 1";
    }
}

function renderComprasPagina() {
    const tbody = document.getElementById("tabela-compras");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (itensCompra.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">Nenhum item na lista de compras.</td></tr>`;
        document.getElementById("info-paginas-compras").innerText = "Página 1 de 1";
        return;
    }

    const totalPaginas = Math.ceil(itensCompra.length / COMPRAS_POR_PAGINA) || 1;
    if (paginaCompras > totalPaginas) paginaCompras = totalPaginas;
    if (paginaCompras < 1)            paginaCompras = 1;

    document.getElementById("info-paginas-compras").innerText = `Página ${paginaCompras} de ${totalPaginas}`;

    const inicio = (paginaCompras - 1) * COMPRAS_POR_PAGINA;
    const pagina = itensCompra.slice(inicio, inicio + COMPRAS_POR_PAGINA);

    pagina.forEach((item) => {
        const comprado = item.status === "COMPRADO";
        const data = item.dataCriacao
            ? new Date(item.dataCriacao).toLocaleDateString("pt-BR")
            : "-";
        tbody.innerHTML += `
            <tr style="${comprado ? "opacity: 0.45;" : ""}">
                <td><input type="checkbox" ${comprado ? "checked" : ""} style="cursor:pointer; width:16px; height:16px;"
                    title="${comprado ? "Marcar como pendente" : "Marcar como comprado"}"
                    onchange="alternarCompra(${item.id})"></td>
                <td style="${comprado ? "text-decoration: line-through;" : ""}">${item.nome}</td>
                <td>${item.quantidade || 1}</td>
                <td>${item.observacao || "-"}</td>
                <td>${item.cliente || "-"}</td>
                <td>${data}</td>
                <td class="col-acoes">
                    <button class="btn-excluir" onclick="excluirItemCompra(${item.id})" title="Excluir">🗑️</button>
                </td>
            </tr>`;
    });
}

function paginaAnteriorCompras() {
    if (paginaCompras > 1) { paginaCompras--; renderComprasPagina(); }
}

function proximaPaginaCompras() {
    if (paginaCompras * COMPRAS_POR_PAGINA < itensCompra.length) { paginaCompras++; renderComprasPagina(); }
}

// =============================================================================
// EXPORTAR PEDIDOS DE COMPRA EM PDF (só os pendentes — pra imprimir e comprar)
// =============================================================================

function exportarPedidosPDF() {
    const pendentes = itensCompra.filter((i) => i.status !== "COMPRADO");

    if (!pendentes.length) {
        showToast("Nenhum item pendente para exportar.", "aviso");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const ML = 14, MR = 14;
    const CW = W - ML - MR;
    let y = 14;

    const PRETO  = [0, 0, 0];
    const CINZA  = [60, 60, 60];
    const CLARO  = [180, 180, 180];
    const RODAPE = [110, 110, 110];

    // Cabeçalho
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRETO);
    doc.text("Unicka Digital", ML, y);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CINZA);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, W - MR, y, { align: "right" });

    y += 7;
    doc.setFontSize(14);
    doc.setTextColor(...CINZA);
    doc.text("Lista de Compras", ML, y);
    doc.setFontSize(11);
    doc.text(`${pendentes.length} item(ns) pendente(s)`, W - MR, y, { align: "right" });
    y += 3;
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.5);
    doc.line(ML, y, ML + CW, y);
    doc.setLineWidth(0.2);
    y += 9;

    // Colunas: [ ] | Produto | Qtd | Observação | Cliente
    const cols = [
        { label: "",           w: CW * 0.07, align: "center", size: 12, bold: false },
        { label: "PRODUTO",    w: CW * 0.35, align: "left",   size: 12, bold: true  },
        { label: "QTD",        w: CW * 0.08, align: "center", size: 12, bold: false },
        { label: "OBSERVACAO", w: CW * 0.30, align: "left",   size: 10, bold: false },
        { label: "CLIENTE",    w: CW * 0.20, align: "left",   size: 10, bold: false },
    ];
    const lineH = 12;

    const desenharCabecalho = () => {
        doc.setFillColor(225, 225, 225);
        doc.rect(ML, y, CW, 8, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        let cx = ML;
        cols.forEach((c) => {
            const tx = c.align === "center" ? cx + c.w / 2 : cx + 2;
            if (c.label) doc.text(c.label, tx, y + 5.5, { align: c.align });
            cx += c.w;
        });
        y += 8;
    };

    desenharCabecalho();

    pendentes.forEach((item, idx) => {
        if (y + lineH > H - 16) { doc.addPage(); y = 14; desenharCabecalho(); }

        if (idx % 2 === 1) { doc.setFillColor(246, 246, 246); doc.rect(ML, y, CW, lineH, "F"); }

        // Quadradinho vazio pra marcar no papel (desenhado, não é caractere)
        const boxSize = 5.5;
        const boxX = ML + (cols[0].w - boxSize) / 2;
        const boxY = y + (lineH - boxSize) / 2;
        doc.setDrawColor(70, 70, 70);
        doc.setLineWidth(0.4);
        doc.rect(boxX, boxY, boxSize, boxSize, "S");
        doc.setLineWidth(0.2);

        const valores = [item.nome || "-", String(item.quantidade || 1), item.observacao || "-", item.cliente || "-"];

        let cx = ML + cols[0].w;
        valores.forEach((txt, i) => {
            const col = cols[i + 1];
            doc.setFontSize(col.size);
            doc.setFont("helvetica", col.bold ? "bold" : "normal");
            doc.setTextColor(...PRETO);
            const tx   = col.align === "center" ? cx + col.w / 2 : cx + 2;
            const maxW = col.w - 4;
            let texto  = String(txt);
            if (doc.getStringUnitWidth(texto) * col.size / doc.internal.scaleFactor > maxW) {
                texto = texto.substring(0, Math.max(1, Math.floor(maxW / (col.size * 0.22)))) + "...";
            }
            doc.text(texto, tx, y + lineH / 2 + 1.6, { align: col.align });
            cx += col.w;
        });

        doc.setDrawColor(...CLARO);
        doc.line(ML, y + lineH, ML + CW, y + lineH);

        y += lineH;
    });

    // Rodapé em todas as páginas
    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(...RODAPE);
        doc.text(`Unicka Digital PDV  -  Lista de Compras  -  Pagina ${i} de ${n}`, W / 2, H - 6, { align: "center" });
    }

    doc.save(`lista-compras-${new Date().toISOString().split("T")[0]}.pdf`);
}

async function adicionarItemCompra() {
    const nome    = document.getElementById("compraNome").value.trim();
    const qtd     = parseInt(document.getElementById("compraQtd").value) || 1;
    const obs     = document.getElementById("compraObs").value.trim();
    const cliente = document.getElementById("compraCliente").value.trim();

    if (!nome) {
        alert("Digite o nome do produto!");
        document.getElementById("compraNome").focus();
        return;
    }

    try {
        const resposta = await fetch(API_COMPRAS, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ nome, quantidade: qtd, observacao: obs || null, cliente: cliente || null }),
        });

        if (resposta.ok) {
            document.getElementById("compraNome").value    = "";
            document.getElementById("compraQtd").value     = "";
            document.getElementById("compraObs").value     = "";
            document.getElementById("compraCliente").value = "";
            document.getElementById("compraNome").focus();
            showToast("Item adicionado à lista de compras!", "sucesso");
            carregarListaCompras();
        } else {
            showToast("Erro: " + await resposta.text(), "erro");
        }
    } catch (erro) {
        console.error("Erro ao adicionar item:", erro);
        showToast("Sem conexão com o sistema — item NÃO adicionado!", "erro");
    }
}

async function alternarCompra(id) {
    try {
        const resposta = await fetch(`${API_COMPRAS}/${id}/status`, { method: "PATCH" });
        if (!resposta.ok) showToast("Erro ao atualizar o item!", "erro");
    } catch (erro) {
        console.error("Erro ao atualizar item:", erro);
        showToast("Sem conexão com o sistema!", "erro");
    }
    carregarListaCompras();
}

async function excluirItemCompra(id) {
    if (!confirm("Excluir este item da lista de compras?")) return;
    try {
        const resposta = await fetch(`${API_COMPRAS}/${id}`, { method: "DELETE" });
        if (resposta.ok) showToast("Item excluído.", "sucesso");
        else             showToast("Erro ao excluir o item!", "erro");
    } catch (erro) {
        console.error("Erro ao excluir item:", erro);
        showToast("Sem conexão com o sistema!", "erro");
    }
    carregarListaCompras();
}
