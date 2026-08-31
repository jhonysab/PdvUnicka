// =============================================================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// =============================================================================

const API_VENDAS   = "http://localhost:8080/api/vendas";
const API_PRODUTOS = "http://localhost:8080/api/produtos";
const API_SANGRIAS = "http://localhost:8080/api/vendas/sangrias";
const API_CAIXA    = "http://localhost:8080/api/caixa";
const API_SERVICOS = "http://localhost:8080/api/servicos";
const API_CONFIG   = "http://localhost:8080/api/config";

let carrinho              = [];
let totalCompra           = 0;   // subtotal bruto (soma dos itens)
let descontoAplicado      = 0;   // desconto em R$ já calculado
let totalComDesconto      = 0;   // valor final a pagar
let bancoProdutosCaixa    = [];
let bancaClientesCaixa    = [];
let formaPagamento        = "DINHEIRO";
let caixaAberto           = null;
let clienteSelecionadoId  = null;

// Dados da loja para o cabeçalho do cupom, preenchidos por carregarDadosDaLoja().
let dadosLoja             = { nome: "UNICKA DIGITAL", cnpj: "", endereco: "" };


// ADMIN + FUNCIONARIO
const _perfil = sessionStorage.getItem("perfil");
if (!_perfil) window.location.href = "index.html";
// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

verificarCaixa();
aplicarVisibilidadePorPerfil();
carregarDadosDaLoja();

// Conferência cega: funcionário não vê os valores do dia (faturamento, dinheiro,
// cartão, PIX) nem o detalhamento no fechamento — senão daria pra deduzir o
// valor esperado da gaveta. Admin vê tudo.
function aplicarVisibilidadePorPerfil() {
    if (_perfil === "ADMIN") return;
    document.querySelectorAll(".card-so-admin, .fch-so-admin").forEach((el) => {
        el.style.display = "none";
    });
}

// Busca no back-end o nome, o CNPJ e o endereço que vão no cabeçalho do cupom.
// Esses dados não ficam no código: vêm do arquivo unicka-local.properties, que
// está fora do Git. Se a busca falhar, o cupom sai com os valores padrão.
async function carregarDadosDaLoja() {
    try {
        const resposta = await fetch(`${API_CONFIG}/loja`);
        if (resposta.ok) dadosLoja = await resposta.json();
    } catch (erro) {
        console.error("Erro ao carregar dados da loja:", erro);
    }
}

window.addEventListener("keydown", (e) => {
    const modalSangriaAberto  = document.getElementById("modalSangria").style.display === "flex";
    const modalAvulsoAberto   = document.getElementById("modalAvulso").style.display === "flex";
    const modalCaixaAberto    = document.getElementById("modalCaixa").style.display === "flex";
    const modalFecharAberto   = document.getElementById("modalFecharCaixa")?.style.display === "flex";
    const modalAbrirAberto    = document.getElementById("modalAbrirCaixa")?.style.display === "flex";
    const modalMovAberto      = document.getElementById("modalMovimentacoes")?.style.display === "flex";
    const modalServicoAberto  = document.getElementById("modalServico")?.style.display === "flex";
    const modalServTurnoAberto = document.getElementById("modalServicosTurno")?.style.display === "flex";

    if (modalServicoAberto) {
        if (e.key === "Escape") fecharModalServico();
        return;
    }

    if (modalServTurnoAberto) {
        if (e.key === "Escape") fecharModalServicosTurno();
        return;
    }

    if (modalMovAberto) {
        if (e.key === "Escape") fecharModalMovimentacoes();
        return;
    }

    if (modalAbrirAberto) {
        if (e.key === "Escape") fecharModalAbrirCaixa();
        return;
    }

    if (modalFecharAberto) {
        if (e.key === "Escape") fecharModalFecharCaixa();
        return;
    }

    if (modalSangriaAberto) {
        if (e.key === "Escape") fecharModalSangria();
        return;
    }

    if (modalAvulsoAberto) {
        if (e.key === "Escape") fecharModalAvulso();
        return;
    }

    if (!modalCaixaAberto) return;

    if (e.key === "F2") { e.preventDefault(); abrirModalAvulso(); }
    if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); finalizarVenda(); }
    if (e.key === "Escape") fecharModalCaixa();
});

// =============================================================================
// CONTROLE DE CAIXA (ABRIR / FECHAR / VERIFICAR)
// =============================================================================

async function verificarCaixa() {
    try {
        const resposta = await fetch(`${API_CAIXA}/atual`);

        if (resposta.ok && resposta.status !== 204) {
            caixaAberto = await resposta.json();
            exibirCaixaAberto();
        } else {
            caixaAberto = null;
            exibirCaixaFechado();
        }
    } catch (erro) {
        console.error("Erro ao verificar caixa:", erro);
        caixaAberto = null;
        exibirCaixaFechado();
    }

    carregarDashboard();
}

function exibirCaixaAberto() {
    document.getElementById("overlay-caixa-fechado").style.display = "none";
    document.getElementById("info-operador").innerText = `Operador: ${caixaAberto.operador}`;
    document.getElementById("info-operador").style.display = "inline-block";
    document.getElementById("btn-fechar-caixa").style.display = "inline-flex";
}

function exibirCaixaFechado() {
    document.getElementById("overlay-caixa-fechado").style.display = "flex";
    document.getElementById("info-operador").style.display = "none";
    document.getElementById("btn-fechar-caixa").style.display = "none";
}

async function confirmarAberturaCaixa() {
    const operador     = document.getElementById("abrirOperador").value.trim();
    const valorInicial = parseFloat(document.getElementById("abrirValorInicial").value) || 0;

    if (!operador) {
        alert("Digite o nome do operador!");
        document.getElementById("abrirOperador").focus();
        return;
    }

    try {
        const resposta = await fetch(`${API_CAIXA}/abrir`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ operador, valorInicial }),
        });

        if (resposta.ok) {
            caixaAberto = await resposta.json();
            document.getElementById("modalAbrirCaixa").style.display = "none";
            exibirCaixaAberto();
            carregarDashboard();
        } else {
            const erro = await resposta.text();
            alert("Erro ao abrir caixa: " + erro);
        }
    } catch (erro) {
        console.error("Erro ao abrir caixa:", erro);
        showToast("Sem conexão com o sistema — o caixa NÃO foi aberto!", "erro");
    }
}

function abrirModalAbrirCaixa() {
    document.getElementById("modalAbrirCaixa").style.display = "flex";
    document.getElementById("abrirOperador").value      = "";
    document.getElementById("abrirValorInicial").value  = "";
    document.getElementById("abrirOperador").focus();
}

function fecharModalAbrirCaixa() {
    document.getElementById("modalAbrirCaixa").style.display = "none";
}

async function abrirModalFecharCaixa() {
    try {
        const resposta = await fetch(`${API_CAIXA}/resumo`);

        if (!resposta.ok || resposta.status === 204) {
            alert("Nenhum caixa aberto!");
            return;
        }

        const resumo = await resposta.json();

        // Preenche os campos do modal de fechamento
        document.getElementById("fch-operador").innerText     = resumo.operador;
        document.getElementById("fch-abertura").innerText     = new Date(resumo.dataAbertura).toLocaleString("pt-BR");
        document.getElementById("fch-valor-inicial").innerText = `R$ ${resumo.valorInicial.toFixed(2)}`;
        document.getElementById("fch-qtd-vendas").innerText   = resumo.qtdVendas;
        document.getElementById("fch-total-vendas").innerText = `R$ ${resumo.totalVendas.toFixed(2)}`;
        document.getElementById("fch-dinheiro").innerText     = `R$ ${resumo.totalDinheiro.toFixed(2)}`;
        document.getElementById("fch-cartao").innerText       = `R$ ${resumo.totalCartao.toFixed(2)}`;
        document.getElementById("fch-pix").innerText          = `R$ ${resumo.totalPix.toFixed(2)}`;
        document.getElementById("fch-sangrias").innerText     = `R$ ${resumo.totalSangrias.toFixed(2)}`;
        document.getElementById("fch-suprimentos").innerText  = `R$ ${(resumo.totalSuprimentos || 0).toFixed(2)}`;

        // Guarda o esperado só para o aviso pós-fechamento
        // (conferência cega: o operador NÃO vê o esperado antes de confirmar.
        // O esperado JÁ inclui os serviços pagos em dinheiro.)
        document.getElementById("modalFecharCaixa").dataset.esperado = resumo.dinheiroEsperado;

        // Serviços de passagem: somados automaticamente dos registros do turno
        document.getElementById("fch-rec-jae").innerText      = `R$ ${(resumo.servicosJae      || 0).toFixed(2)}`;
        document.getElementById("fch-rec-celular").innerText  = `R$ ${(resumo.servicosCelular  || 0).toFixed(2)}`;
        document.getElementById("fch-rec-contas").innerText   = `R$ ${(resumo.servicosContas   || 0).toFixed(2)}`;
        document.getElementById("fch-rec-cartao").innerText   = `R$ ${(resumo.servicosCartao   || 0).toFixed(2)}`;
        document.getElementById("fch-total-servicos").innerText  = `R$ ${(resumo.totalServicos    || 0).toFixed(2)}`;
        document.getElementById("fch-servicos-gaveta").innerText = `R$ ${(resumo.servicosDinheiro || 0).toFixed(2)}`;

        document.getElementById("fch-contado").value = "";

        document.getElementById("modalFecharCaixa").style.display = "flex";

    } catch (erro) {
        console.error("Erro ao carregar resumo:", erro);
    }
}

function fecharModalFecharCaixa() {
    document.getElementById("modalFecharCaixa").style.display = "none";
}

async function confirmarFechamentoCaixa() {
    const valorContado = parseFloat(document.getElementById("fch-contado").value);

    if (isNaN(valorContado)) {
        alert("Informe o valor contado na gaveta!");
        document.getElementById("fch-contado").focus();
        return;
    }

    if (!confirm("Confirmar fechamento de caixa? Esta ação não pode ser desfeita.")) return;

    try {
        // Os totais de serviços são calculados pelo servidor a partir dos
        // serviços registrados no turno — só o valor contado é enviado.
        const resposta = await fetch(`${API_CAIXA}/fechar`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ valorContado }),
        });

        if (resposta.ok) {
            // Agora sim revela a diferença — depois de confirmado, não dá mais para "ajustar".
            // O esperado já inclui os serviços pagos em dinheiro.
            const esperado  = parseFloat(document.getElementById("modalFecharCaixa").dataset.esperado) || 0;
            const diferenca = valorContado - esperado;

            // Cor do aviso: exata = verde, sobra = azul (não é erro, dinheiro a mais),
            // falta = vermelho. Diferenças ficam mais tempo na tela para dar tempo de ler.
            let msgDif, tipoToast;
            if (Math.abs(diferenca) < 0.005) {
                msgDif    = "Gaveta exata, sem diferença! ✅";
                tipoToast = "sucesso";
            } else if (diferenca > 0) {
                msgDif    = `Sobra de R$ ${diferenca.toFixed(2)} na gaveta.`;
                tipoToast = "info";
            } else {
                msgDif    = `Falta de R$ ${Math.abs(diferenca).toFixed(2)} na gaveta.`;
                tipoToast = "erro";
            }

            showToast(`Caixa fechado! ${msgDif}`, tipoToast, tipoToast === "sucesso" ? 3000 : 6000);
            fecharModalFecharCaixa();
            caixaAberto = null;
            exibirCaixaFechado();
            carregarDashboard();
        } else {
            const erro = await resposta.text();
            showToast("Erro ao fechar caixa: " + erro, "erro");
        }
    } catch (erro) {
        console.error("Erro ao fechar caixa:", erro);
        showToast("Sem conexão com o sistema — o caixa NÃO foi fechado!", "erro");
    }
}

// =============================================================================
// DASHBOARD
// =============================================================================

async function carregarDashboard() {
    try {
        // Tenta buscar o caixa aberto pra filtrar por turno
        let caixaAtual  = null;
        let usarResumo  = false;

        try {
            const respCaixa = await fetch(`${API_CAIXA}/atual`);
            if (respCaixa.ok && respCaixa.status !== 204) {
                caixaAtual = await respCaixa.json();
                usarResumo = true;
            }
        } catch (e) {
            // Sem endpoint de caixa — segue com modo geral
        }

        // --- CARDS: usa resumo do turno se disponível ---
        if (usarResumo) {
            try {
                const respResumo = await fetch(`${API_CAIXA}/resumo`);
                if (respResumo.ok && respResumo.status !== 204) {
                    const r = await respResumo.json();
                    document.getElementById("card-qtd-vendas").innerText  = r.qtdVendas;
                    document.getElementById("card-total-ganho").innerText = `R$ ${r.totalVendas.toFixed(2)}`;
                    document.getElementById("card-dinheiro").innerText    = `R$ ${r.totalDinheiro.toFixed(2)}`;
                    document.getElementById("card-cartao").innerText      = `R$ ${r.totalCartao.toFixed(2)}`;
                    document.getElementById("card-pix").innerText         = `R$ ${r.totalPix.toFixed(2)}`;
                    document.getElementById("card-sangrias").innerText    = `R$ ${r.totalSangrias.toFixed(2)}`;
                    document.getElementById("card-servicos").innerText    = `R$ ${(r.totalServicos || 0).toFixed(2)}`;
                }
            } catch (e) {
                console.error("Erro ao buscar resumo do caixa:", e);
            }
        }

        // --- HISTÓRICO: filtra por período do turno se possível ---
        let vendas   = [];
        let sangrias = [];

        if (usarResumo && caixaAtual && caixaAtual.dataAbertura) {
            const inicio = caixaAtual.dataAbertura.split("T")[0];
            const fim    = new Date().toISOString().split("T")[0];

            [vendas, sangrias] = await Promise.all([
                fetch(`${API_VENDAS}/periodo?inicio=${inicio}&fim=${fim}`).then((r) => r.json()),
                fetch(API_SANGRIAS).then((r) => r.json()).catch(() => []),
            ]);

            // Filtra vendas do turno: pelo caixaId quando existir (vendas novas),
            // senão pela hora de abertura (vendas antigas, sem caixaId)
            const aberturaMs = new Date(caixaAtual.dataAbertura).getTime();
            vendas = vendas.filter((v) => v.caixaId != null
                ? v.caixaId === caixaAtual.id
                : new Date(v.dataHora).getTime() >= aberturaMs);

        } else {
            // Modo geral — sem caixa aberto, mostra tudo
            [vendas, sangrias] = await Promise.all([
                fetch(API_VENDAS).then((r) => r.json()),
                fetch(API_SANGRIAS).then((r) => r.json()).catch(() => []),
            ]);

            // Calcula cards no modo geral
            let faturamentoTotal = 0, totalDinheiro = 0, totalCartao = 0, totalPix = 0;
            vendas.forEach((v) => {
                faturamentoTotal += v.valorTotal;
                const forma = v.formaPagamento || "DINHEIRO";
                if (forma === "DINHEIRO")                              totalDinheiro += v.valorTotal;
                else if (forma === "CREDITO" || forma === "DEBITO")    totalCartao   += v.valorTotal;
                else if (forma === "PIX")                              totalPix      += v.valorTotal;
            });

            const totalSangrias = Array.isArray(sangrias)
                ? sangrias.filter((s) => s.tipo !== "SUPRIMENTO").reduce((acc, s) => acc + (s.valor || 0), 0) : 0;

            document.getElementById("card-qtd-vendas").innerText  = vendas.length;
            document.getElementById("card-total-ganho").innerText = `R$ ${faturamentoTotal.toFixed(2)}`;
            document.getElementById("card-dinheiro").innerText    = `R$ ${totalDinheiro.toFixed(2)}`;
            document.getElementById("card-cartao").innerText      = `R$ ${totalCartao.toFixed(2)}`;
            document.getElementById("card-pix").innerText         = `R$ ${totalPix.toFixed(2)}`;
            document.getElementById("card-sangrias").innerText    = `R$ ${totalSangrias.toFixed(2)}`;
            document.getElementById("card-servicos").innerText    = "R$ 0,00";
        }

        // --- TABELA DO HISTÓRICO ---
        const tbodyHistorico     = document.getElementById("lista-historico-vendas");
        tbodyHistorico.innerHTML = "";

        [...vendas].reverse().forEach((v) => {
            const dataFormatada = v.dataHora
                ? new Date(v.dataHora).toLocaleString("pt-BR")
                : "Data nula";

            const textoItens = v.itens
                ? v.itens.map((i) => `${i.quantidade}x ${i.descricao || i.produto.nome}`).join(", ")
                : "Sem detalhes";

            const forma          = v.formaPagamento || "DINHEIRO";
            const badgePagamento = renderBadgePagamento(forma);

            tbodyHistorico.innerHTML += `
                <tr>
                    <td>#${v.id}</td>
                    <td>${dataFormatada}</td>
                    <td class="td-itens">${textoItens}</td>
                    <td>${badgePagamento}</td>
                    <td class="td-valor">R$ ${v.valorTotal.toFixed(2)}</td>
                </tr>
            `;
        });

    } catch (erro) {
        console.error("Erro ao carregar o dashboard:", erro);
    }
}

function renderBadgePagamento(forma) {
    const mapa = {
        DINHEIRO: { label: "Dinheiro", classe: "badge-dinheiro" },
        CREDITO:  { label: "Crédito",  classe: "badge-cartao"   },
        DEBITO:   { label: "Débito",   classe: "badge-cartao"   },
        PIX:      { label: "PIX",      classe: "badge-pix"      },
    };
    const info = mapa[forma] || { label: forma, classe: "badge-outro" };
    return `<span class="badge-pagamento ${info.classe}">${info.label}</span>`;
}

// =============================================================================
// MODAL DO CAIXA
// =============================================================================

function abrirModalCaixa() {
    document.getElementById("modalCaixa").style.display = "flex";
    carregarProdutosParaBusca();
    carregarClientesParaBusca();
    selecionarPagamento(document.querySelector('[data-forma="DINHEIRO"]'));
    document.getElementById("buscaProduto").focus();
}

function fecharModalCaixa() {
    document.getElementById("modalCaixa").style.display = "none";

    carrinho             = [];
    formaPagamento       = "DINHEIRO";
    clienteSelecionadoId = null;
    limparClienteCaixa();

    document.getElementById("buscaProduto").value     = "";
    document.getElementById("info-estoque").innerText  = "";
    document.getElementById("quantidade").value       = "1";
    document.getElementById("valorRecebido").value    = "";
    document.getElementById("valor-troco").innerText  = "R$ 0,00";
    document.getElementById("descontoValor").value    = "";
    document.getElementById("descontoTipo").value     = "RS";
    document.getElementById("info-desconto").innerText = "";

    atualizarTelaCarrinho();
}

// =============================================================================
// FORMAS DE PAGAMENTO
// =============================================================================

function selecionarPagamento(botao) {
    if (!botao) return;

    // Atualiza estado
    formaPagamento = botao.dataset.forma;

    // Atualiza visual dos botões
    document.querySelectorAll(".btn-pagamento").forEach((b) => b.classList.remove("ativo"));
    botao.classList.add("ativo");

    // Mostra/esconde a seção de troco (só para dinheiro)
    const secaoTroco = document.getElementById("secao-troco");
    if (formaPagamento === "DINHEIRO") {
        secaoTroco.style.display = "block";
    } else {
        secaoTroco.style.display = "none";
        document.getElementById("valorRecebido").value   = "";
        document.getElementById("valor-troco").innerText = "R$ 0,00";
    }
}

// =============================================================================
// BUSCA E AUTOCOMPLETE DE PRODUTOS
// =============================================================================

async function carregarClientesParaBusca() {
    try {
        const resposta     = await fetch("http://localhost:8080/api/clientes");
        bancaClientesCaixa = await resposta.json();
    } catch (e) {
        bancaClientesCaixa = [];
    }
}

function buscarClientesCaixa() {
    const termo = document.getElementById("busca-cliente-caixa").value.toLowerCase();
    const lista = document.getElementById("lista-sugestoes-cliente");
    lista.innerHTML = "";

    if (termo.length < 2) { lista.style.display = "none"; return; }

    const resultados = bancaClientesCaixa
        .filter((c) =>
            c.nome.toLowerCase().includes(termo) ||
            (c.cpf || "").includes(termo) ||
            (c.telefone || "").includes(termo)
        )
        .slice(0, 6);

    if (!resultados.length) { lista.style.display = "none"; return; }

    resultados.forEach((c) => {
        lista.innerHTML += `
            <div class="item-sugestao" onclick="selecionarClienteCaixa(${c.id}, '${c.nome.replace(/'/g, "\\'")}')">
                <strong>${c.nome}</strong><br>
                <small>${c.telefone || c.cpf || "sem contato"}</small>
            </div>`;
    });

    lista.style.display = "block";
}

function selecionarClienteCaixa(id, nome) {
    clienteSelecionadoId = id;
    document.getElementById("busca-cliente-caixa").value           = nome;
    document.getElementById("lista-sugestoes-cliente").style.display = "none";
    document.getElementById("btn-limpar-cliente").style.display     = "inline-block";
}

function limparClienteCaixa() {
    clienteSelecionadoId = null;
    const input = document.getElementById("busca-cliente-caixa");
    const btn   = document.getElementById("btn-limpar-cliente");
    const lista = document.getElementById("lista-sugestoes-cliente");
    if (input) input.value       = "";
    if (btn)   btn.style.display = "none";
    if (lista) lista.style.display = "none";
}

document.addEventListener("click", (event) => {
    const campo = document.getElementById("campo-cliente-caixa");
    const lista = document.getElementById("lista-sugestoes-cliente");
    if (campo && lista && !campo.contains(event.target)) {
        lista.style.display = "none";
    }
});

async function carregarProdutosParaBusca() {
    try {
        const resposta     = await fetch(API_PRODUTOS);
        bancoProdutosCaixa = await resposta.json();
        bancoProdutosCaixa = bancoProdutosCaixa.filter(p => p.nome !== "VENDA AVULSA");
        bancoProdutosCaixa.sort((a, b) => a.nome.localeCompare(b.nome));
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
    }
}

function mostrarEstoque() {
    const val  = document.getElementById("buscaProduto").value;
    const info = document.getElementById("info-estoque");

    const prod = bancoProdutosCaixa.find(
        (p) => p.nome.toLowerCase() === val.toLowerCase() || p.codigoBarras === val
    );

    if (!prod) { info.innerText = ""; return; }

    if (prod.estoque > 0) {
        info.innerText   = `📦 Estoque atual: ${prod.estoque} unidades`;
        info.style.color = "#34d399";
    } else {
        info.innerText   = "🔴 PRODUTO SEM ESTOQUE";
        info.style.color = "#f87171";
    }
}

function buscarSugestoes() {
    const termo = document.getElementById("buscaProduto").value.toLowerCase();
    const lista = document.getElementById("lista-sugestoes");
    lista.innerHTML = "";

    if (termo.length === 0) { lista.style.display = "none"; return; }

    const resultados = bancoProdutosCaixa
        .filter((p) =>
            p.nome.toLowerCase().includes(termo) ||
            (p.codigoBarras || "").toLowerCase().includes(termo)
        )
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .slice(0, 8);

    resultados.forEach((produto) => {
        lista.innerHTML += `
            <div class="item-sugestao" onclick="selecionarProduto('${produto.nome}')">
                <strong>${produto.nome}</strong><br>
                <small>Estoque: ${produto.estoque}</small>
            </div>
        `;
    });

    lista.style.display = resultados.length > 0 ? "block" : "none";
}

function selecionarProduto(nomeProduto) {
    document.getElementById("buscaProduto").value      = nomeProduto;
    document.getElementById("lista-sugestoes").style.display = "none";
    mostrarEstoque();
    document.getElementById("quantidade").focus();
}

document.addEventListener("click", (event) => {
    const busca      = document.getElementById("buscaProduto");
    const lista      = document.getElementById("lista-sugestoes");
    if (busca && lista && event.target !== busca && !lista.contains(event.target)) {
        lista.style.display = "none";
    }
});

function verificarEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) adicionarAoCarrinho();
}

// Enter no campo de busca: pula para a quantidade (o Enter da quantidade adiciona).
// Shift+Enter é ignorado aqui — ele finaliza a venda (atalho global).
function enterBuscaProduto(event) {
    if (event.key !== "Enter" || event.shiftKey) return;
    document.getElementById("lista-sugestoes").style.display = "none";
    const qtd = document.getElementById("quantidade");
    qtd.focus();
    qtd.select();
}

// Ao sair do campo (TAB ou clique fora), esconde a lista de sugestões.
// O atraso deixa o clique numa sugestão ser registrado antes de sumir.
function esconderSugestoes(idLista) {
    setTimeout(() => {
        const lista = document.getElementById(idLista);
        if (lista) lista.style.display = "none";
    }, 200);
}

// =============================================================================
// CARRINHO
// =============================================================================

function adicionarAoCarrinho() {
    const val = document.getElementById("buscaProduto").value.trim();
    const qtd = parseInt(document.getElementById("quantidade").value);

    if (!val || qtd <= 0 || isNaN(qtd)) {
        alert("Selecione um produto e digite uma quantidade válida!");
        return;
    }

    // Prioridade: código de barras exato (leitor bipa e dá Enter),
    // depois nome exato, por último nome parcial
    const termo = val.toLowerCase();
    const produtoAchado =
        bancoProdutosCaixa.find((p) => p.codigoBarras && p.codigoBarras === val) ||
        bancoProdutosCaixa.find((p) => p.nome.toLowerCase() === termo) ||
        bancoProdutosCaixa.find((p) => p.nome.toLowerCase().includes(termo));

    if (!produtoAchado) {
        alert("Produto não encontrado no sistema!");
        return;
    }

    const itemExistente    = carrinho.find((item) => item.produto.id === produtoAchado.id);
    const qtdTotalDesejada = itemExistente ? itemExistente.quantidade + qtd : qtd;

    if (produtoAchado.estoque < qtdTotalDesejada) {
        alert(`Estoque insuficiente! Você tentou adicionar ${qtdTotalDesejada} un., mas só há ${produtoAchado.estoque} disponíveis.`);
        return;
    }

    if (itemExistente) {
        itemExistente.quantidade += qtd;
    } else {
        carrinho.push({
            produto:    { id: produtoAchado.id, nome: produtoAchado.nome, preco: produtoAchado.preco },
            quantidade: qtd,
        });
    }

    atualizarTelaCarrinho();
    limparCamposBusca();
}

function removerDoCarrinho(index) {
    carrinho.splice(index, 1);
    atualizarTelaCarrinho();
    document.getElementById("buscaProduto").focus();
}

function alterarQuantidade(index, variacao) {
    carrinho[index].quantidade += variacao;
    if (carrinho[index].quantidade <= 0) carrinho.splice(index, 1);
    atualizarTelaCarrinho();
}

function atualizarTelaCarrinho() {
    const tbody     = document.getElementById("lista-carrinho");
    tbody.innerHTML = "";
    totalCompra     = 0;
    let totalItens  = 0;

    carrinho.forEach((item, index) => {
        const totalItem  = item.produto.preco * item.quantidade;
        totalCompra     += totalItem;
        totalItens      += item.quantidade;

        tbody.innerHTML += `
            <tr>
                <td class="td-nome">${item.produto.nome}</td>
                <td>
                    <button class="btn-qtd" onclick="alterarQuantidade(${index}, -1)">−</button>
                    ${item.quantidade}
                    <button class="btn-qtd" onclick="alterarQuantidade(${index}, 1)">+</button>
                </td>
                <td>R$ ${item.produto.preco.toFixed(2)}</td>
                <td class="td-valor">R$ ${totalItem.toFixed(2)}</td>
                <td class="col-acao">
                    <button class="btn-excluir" onclick="removerDoCarrinho(${index})">🗑️</button>
                </td>
            </tr>
        `;
    });

    // Desconto: em R$ direto ou em % sobre o subtotal, sempre limitado ao total
    const descontoInput = parseFloat(document.getElementById("descontoValor").value) || 0;
    const descontoTipo  = document.getElementById("descontoTipo").value;
    let desconto = descontoTipo === "PCT" ? totalCompra * (descontoInput / 100) : descontoInput;
    desconto = Math.min(Math.max(desconto, 0), totalCompra);

    descontoAplicado = Math.round(desconto * 100) / 100;
    totalComDesconto = Math.round((totalCompra - descontoAplicado) * 100) / 100;

    document.getElementById("total-geral").innerText = `R$ ${totalComDesconto.toFixed(2)}`;
    document.getElementById("total-itens").innerText = totalItens;
    document.getElementById("info-desconto").innerText = descontoAplicado > 0
        ? `Subtotal R$ ${totalCompra.toFixed(2)} − desconto R$ ${descontoAplicado.toFixed(2)}`
        : "";

    // Recalcula troco se modo dinheiro
    if (formaPagamento === "DINHEIRO") calcularTroco();
}

// =============================================================================
// PAGAMENTO E TROCO
// =============================================================================

function calcularTroco() {
    const recebido = parseFloat(document.getElementById("valorRecebido").value) || 0;
    const troco    = recebido - totalComDesconto;
    document.getElementById("valor-troco").innerText = `R$ ${Math.max(troco, 0).toFixed(2)}`;
}

async function finalizarVenda() {
    if (carrinho.length === 0) {
        alert("O carrinho está vazio!");
        return;
    }

    const totalItens  = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const labelForma  = { DINHEIRO: "Dinheiro", CREDITO: "Crédito", DEBITO: "Débito", PIX: "PIX" };
    const linhaDesc   = descontoAplicado > 0
        ? `\nSubtotal: R$ ${totalCompra.toFixed(2)}\nDesconto: R$ ${descontoAplicado.toFixed(2)}`
        : "";
    const confirmacao = confirm(
        `Confirmar venda?\n\nItens: ${totalItens}${linhaDesc}\nTotal: R$ ${totalComDesconto.toFixed(2)}\nPagamento: ${labelForma[formaPagamento]}`
    );

    if (!confirmacao) return;

    // Validação extra para dinheiro: valor recebido deve cobrir o total
    if (formaPagamento === "DINHEIRO") {
        const recebido = parseFloat(document.getElementById("valorRecebido").value) || 0;
        if (recebido > 0 && recebido < totalComDesconto) {
            alert(`Valor recebido (R$ ${recebido.toFixed(2)}) é menor que o total (R$ ${totalComDesconto.toFixed(2)})!`);
            return;
        }
    }

    try {
        const payload = {
            itens:          carrinho,
            formaPagamento: formaPagamento,
            clienteId:      clienteSelecionadoId || null,
            desconto:       descontoAplicado,
        };

        const resposta = await fetch(API_VENDAS, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload),
        });

        if (resposta.ok) {
            const recebido = parseFloat(document.getElementById("valorRecebido").value) || totalComDesconto;
            const troco    = Math.max(recebido - totalComDesconto, 0);

            imprimirCupom({
                itens:         carrinho,
                subtotal:      totalCompra,
                desconto:      descontoAplicado,
                total:         totalComDesconto,
                recebido:      formaPagamento === "DINHEIRO" ? recebido : totalComDesconto,
                troco:         formaPagamento === "DINHEIRO" ? troco    : 0,
                formaPagamento: formaPagamento,
            });

            fecharModalCaixa();
            carregarDashboard();
            showToast("Venda registrada com sucesso!", "sucesso");
        } else {
            const erroTexto = await resposta.text();
            showToast("Erro: " + erroTexto, "erro");
        }

    } catch (erro) {
        console.error("Erro ao enviar venda:", erro);
        showToast("Sem conexão com o sistema — a venda NÃO foi registrada!", "erro");
    }
}

// =============================================================================
// SANGRIA
// =============================================================================

let tipoMovimentacao = "SANGRIA";

function abrirModalSangria(tipo) {
    tipoMovimentacao = tipo === "SUPRIMENTO" ? "SUPRIMENTO" : "SANGRIA";

    const ehSangria = tipoMovimentacao === "SANGRIA";
    document.getElementById("sangria-titulo").innerHTML      = ehSangria
        ? '<span class="seta-sangria">▼</span> Registrar Sangria'
        : '<span class="seta-suprimento">▲</span> Registrar Suprimento';
    document.getElementById("sangria-desc").innerText        = ehSangria ? "Retirada de dinheiro do caixa" : "Entrada de dinheiro no caixa (ex: troco)";
    document.getElementById("sangria-label-valor").innerText = ehSangria ? "Valor retirado (R$):" : "Valor adicionado (R$):";
    document.getElementById("sangria-btn-confirmar").innerText = ehSangria ? "✔ Confirmar Sangria" : "✔ Confirmar Suprimento";
    document.getElementById("sangriaMotivo").placeholder = ehSangria
        ? "Ex: Troco para caixa, Pagamento fornecedor..."
        : "Ex: Reforço de troco, Dinheiro do cofre...";

    document.getElementById("modalSangria").style.display = "flex";
    document.getElementById("sangriaValor").value  = "";
    document.getElementById("sangriaMotivo").value = "";
    document.getElementById("sangriaValor").focus();
}

function fecharModalSangria() {
    document.getElementById("modalSangria").style.display = "none";
}

async function confirmarSangria() {
    const valor  = parseFloat(document.getElementById("sangriaValor").value);
    const motivo = document.getElementById("sangriaMotivo").value.trim();
    const nome   = tipoMovimentacao === "SANGRIA" ? "sangria" : "suprimento";

    if (!valor || valor <= 0) {
        alert(`Digite um valor válido para ${nome === "sangria" ? "a sangria" : "o suprimento"}!`);
        document.getElementById("sangriaValor").focus();
        return;
    }

    if (!motivo) {
        alert(`Digite o motivo!`);
        document.getElementById("sangriaMotivo").focus();
        return;
    }

    try {
        const resposta = await fetch(API_SANGRIAS, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ valor, motivo, tipo: tipoMovimentacao }),
        });

        if (resposta.ok) {
            showToast(`${nome === "sangria" ? "Sangria" : "Suprimento"} de R$ ${valor.toFixed(2)} registrado!`, "sucesso");
            fecharModalSangria();
            carregarDashboard();
        } else {
            const erroTexto = await resposta.text();
            showToast("Erro: " + erroTexto, "erro");
        }

    } catch (erro) {
        console.error(`Erro ao registrar ${nome}:`, erro);
        showToast(`Sem conexão com o sistema — ${nome} NÃO registrado(a)!`, "erro");
    }
}

// =============================================================================
// SERVIÇOS / RECARGAS (dinheiro de passagem — registrado na hora)
// =============================================================================

const TIPO_SERVICO_LABEL = { JAE: "🚌 Jaé", CELULAR: "📱 Celular", CONTAS: "📄 Conta" };
const FORMA_SERVICO_LABEL = { DINHEIRO: "Dinheiro", CREDITO: "Crédito", DEBITO: "Débito", PIX: "PIX" };

function abrirModalServico() {
    if (!caixaAberto) {
        alert("Abra o caixa antes de registrar serviços!");
        return;
    }
    document.getElementById("modalServico").style.display = "flex";
    document.getElementById("servicoTipo").value      = "CELULAR";
    document.getElementById("servicoValor").value     = "";
    document.getElementById("servicoForma").value     = "DINHEIRO";
    document.getElementById("servicoDescricao").value = "";
    document.getElementById("servicoValor").focus();
}

function fecharModalServico() {
    document.getElementById("modalServico").style.display = "none";
}

async function confirmarServico() {
    const tipo      = document.getElementById("servicoTipo").value;
    const valor     = parseFloat(document.getElementById("servicoValor").value);
    const forma     = document.getElementById("servicoForma").value;
    const descricao = document.getElementById("servicoDescricao").value.trim();

    if (!valor || valor <= 0) {
        alert("Digite um valor válido para o serviço!");
        document.getElementById("servicoValor").focus();
        return;
    }

    try {
        const resposta = await fetch(API_SERVICOS, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ tipo, valor, formaPagamento: forma, descricao: descricao || null }),
        });

        if (resposta.ok) {
            showToast(`Serviço de R$ ${valor.toFixed(2)} registrado!`, "sucesso");
            fecharModalServico();
            carregarDashboard();
        } else {
            showToast("Erro: " + await resposta.text(), "erro");
        }
    } catch (erro) {
        console.error("Erro ao registrar serviço:", erro);
        showToast("Sem conexão com o sistema — serviço NÃO registrado!", "erro");
    }
}

async function abrirModalServicosTurno() {
    const lista = document.getElementById("lista-servicos");
    lista.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Carregando...</p>';
    document.getElementById("modalServicosTurno").style.display = "flex";

    if (!caixaAberto) {
        lista.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Nenhum caixa aberto.</p>';
        return;
    }

    try {
        const resposta = await fetch(`${API_SERVICOS}/turno`);
        const servicos = resposta.ok && resposta.status !== 204 ? await resposta.json() : [];

        if (!servicos.length) {
            lista.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Nenhum serviço registrado neste turno.</p>';
            return;
        }

        let totalDinheiro = 0, totalCartaoPix = 0;
        const linhas = servicos.map((s) => {
            const emDinheiro = s.formaPagamento === "DINHEIRO";
            if (emDinheiro) totalDinheiro  += s.valor || 0;
            else            totalCartaoPix += s.valor || 0;

            const dataHora = s.dataHora ? new Date(s.dataHora).toLocaleString("pt-BR", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
            }) : "-";

            return `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid #2a3347;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600;">${TIPO_SERVICO_LABEL[s.tipo] || s.tipo}${s.descricao ? ` — ${s.descricao}` : ""}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${dataHora} — ${FORMA_SERVICO_LABEL[s.formaPagamento] || s.formaPagamento}</div>
                    </div>
                    <strong style="color: ${emDinheiro ? "#34d399" : "#60a5fa"}; white-space: nowrap;">R$ ${(s.valor || 0).toFixed(2)}</strong>
                    <button class="btn-excluir" onclick="excluirServico(${s.id})" title="Excluir (registrado errado)">🗑️</button>
                </div>`;
        }).join("");

        lista.innerHTML = linhas + `
            <div style="display: flex; justify-content: space-between; padding: 10px 4px 0; font-size: 13px;">
                <span>💵 Em dinheiro (na gaveta): <strong style="color:#34d399;">R$ ${totalDinheiro.toFixed(2)}</strong></span>
                <span>💳 Cartão/PIX: <strong style="color:#60a5fa;">R$ ${totalCartaoPix.toFixed(2)}</strong></span>
            </div>`;

    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro);
        lista.innerHTML = '<p style="color: #f87171; font-size: 13px;">Erro ao carregar os serviços.</p>';
    }
}

function fecharModalServicosTurno() {
    document.getElementById("modalServicosTurno").style.display = "none";
}

async function excluirServico(id) {
    if (!confirm("Excluir este serviço? Use apenas se foi registrado errado.")) return;
    try {
        const resposta = await fetch(`${API_SERVICOS}/${id}`, { method: "DELETE" });
        if (resposta.ok) {
            showToast("Serviço excluído.", "sucesso");
            carregarDashboard();
        } else {
            showToast("Erro: " + await resposta.text(), "erro");
        }
    } catch (erro) {
        console.error("Erro ao excluir serviço:", erro);
        showToast("Sem conexão com o sistema!", "erro");
    }
    abrirModalServicosTurno();
}

// =============================================================================
// MOVIMENTAÇÕES DE DINHEIRO (lista de sangrias/suprimentos com motivo)
// =============================================================================

async function abrirModalMovimentacoes() {
    const lista = document.getElementById("lista-movimentacoes");
    lista.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Carregando...</p>';
    document.getElementById("mov-subtitulo").innerText = caixaAberto
        ? "Sangrias e suprimentos do turno atual"
        : "Sangrias e suprimentos (sem caixa aberto — mostrando todas)";
    document.getElementById("modalMovimentacoes").style.display = "flex";

    try {
        let movs = await fetch(API_SANGRIAS).then((r) => r.json());
        if (!Array.isArray(movs)) movs = [];

        // Com caixa aberto, mostra só as movimentações do turno
        if (caixaAberto) {
            const aberturaMs = new Date(caixaAberto.dataAbertura).getTime();
            movs = movs.filter((m) => m.caixa?.id != null
                ? m.caixa.id === caixaAberto.id
                : new Date(m.dataHora).getTime() >= aberturaMs);
        }

        if (movs.length === 0) {
            lista.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">Nenhuma movimentação registrada.</p>';
            return;
        }

        let totalSangria = 0, totalSuprimento = 0;
        const linhas = movs
            .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))
            .map((m) => {
                const ehSuprimento = m.tipo === "SUPRIMENTO";
                if (ehSuprimento) totalSuprimento += m.valor || 0;
                else              totalSangria    += m.valor || 0;

                const dataHora = m.dataHora ? new Date(m.dataHora).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                }) : "-";

                return `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid #2a3347;">
                        <span style="font-size: 18px;" class="${ehSuprimento ? "seta-suprimento" : "seta-sangria"}">${ehSuprimento ? "▲" : "▼"}</span>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600;">${m.motivo || "(sem motivo)"}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">${dataHora} — ${ehSuprimento ? "Suprimento" : "Sangria"}</div>
                        </div>
                        <strong style="color: ${ehSuprimento ? "#34d399" : "#f87171"}; white-space: nowrap;">
                            ${ehSuprimento ? "+" : "−"} R$ ${(m.valor || 0).toFixed(2)}
                        </strong>
                    </div>`;
            }).join("");

        lista.innerHTML = linhas + `
            <div style="display: flex; justify-content: space-between; padding: 10px 4px 0; font-size: 13px;">
                <span><span class="seta-sangria">▼</span> Total sangrias: <strong style="color:#f87171;">R$ ${totalSangria.toFixed(2)}</strong></span>
                <span><span class="seta-suprimento">▲</span> Total suprimentos: <strong style="color:#34d399;">R$ ${totalSuprimento.toFixed(2)}</strong></span>
            </div>`;

    } catch (erro) {
        console.error("Erro ao carregar movimentações:", erro);
        lista.innerHTML = '<p style="color: #f87171; font-size: 13px;">Erro ao carregar as movimentações.</p>';
    }
}

function fecharModalMovimentacoes() {
    document.getElementById("modalMovimentacoes").style.display = "none";
}

// =============================================================================
// VENDA AVULSA (F2)
// =============================================================================

function abrirModalAvulso() {
    document.getElementById("modalAvulso").style.display = "flex";
    document.getElementById("avulsoDescricao").value = "";
    document.getElementById("avulsoPreco").value     = "";
    document.getElementById("avulsoQtd").value       = "1";
    document.getElementById("avulsoDescricao").focus();
}

function fecharModalAvulso() {
    document.getElementById("modalAvulso").style.display = "none";
    document.getElementById("buscaProduto").focus();
}

function confirmarAvulso() {
    const descricao = document.getElementById("avulsoDescricao").value.trim();
    const preco     = parseFloat(document.getElementById("avulsoPreco").value);
    const qtd       = parseInt(document.getElementById("avulsoQtd").value);

    if (!descricao) { alert("Digite a descrição do produto!"); document.getElementById("avulsoDescricao").focus(); return; }
    if (!preco || preco <= 0) { alert("Digite um preço válido!"); document.getElementById("avulsoPreco").focus(); return; }
    if (!qtd   || qtd   <= 0) { alert("Digite uma quantidade válida!"); document.getElementById("avulsoQtd").focus(); return; }

    carrinho.push({
        produto:       { id: null, nome: `[AVULSO] ${descricao}`, preco: preco },
        quantidade:    qtd,
        precoUnitario: preco,
        avulso:        true,
        descricao:     `[AVULSO] ${descricao}`, // gravada na venda para aparecer nos históricos
    });

    atualizarTelaCarrinho();
    fecharModalAvulso();
}

// =============================================================================
// IMPRESSÃO DE CUPOM
// =============================================================================

function imprimirCupom(dadosVenda) {
    const agora      = new Date();
    const dataStr    = agora.toLocaleDateString("pt-BR");
    const horaStr    = agora.toLocaleTimeString("pt-BR");
    const totalItens = dadosVenda.itens.reduce((acc, i) => acc + i.quantidade, 0);

    const labelForma = { DINHEIRO: "Dinheiro", CREDITO: "Cartão Crédito", DEBITO: "Cartão Débito", PIX: "PIX" };

    let linhasItens = "";
    dadosVenda.itens.forEach((item, idx) => {
        const totalItem = item.produto.preco * item.quantidade;
        linhasItens += `
            <tr>
                <td colspan="3" style="padding: 2px 0 0 0; font-weight: bold;">
                    ${String(idx + 1).padStart(3, "0")}  ${item.produto.nome}
                </td>
            </tr>
            <tr>
                <td style="padding: 0 0 4px 20px;">${item.quantidade}x</td>
                <td style="text-align: right; padding: 0;">${item.produto.preco.toFixed(2)}</td>
                <td style="text-align: right; padding: 0; font-weight: bold;">${totalItem.toFixed(2)}</td>
            </tr>
        `;
    });

    // Linhas de subtotal/desconto: só aparecem quando há desconto
    const linhasDesconto = (dadosVenda.desconto || 0) > 0 ? `
        <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">R$ ${dadosVenda.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
            <td>Desconto:</td>
            <td style="text-align: right; font-weight: bold;">- R$ ${dadosVenda.desconto.toFixed(2)}</td>
        </tr>
    ` : "";

    // Linha de troco: só aparece se for dinheiro
    const linhaTroco = dadosVenda.formaPagamento === "DINHEIRO" ? `
        <tr>
            <td>Valor recebido:</td>
            <td style="text-align: right;">R$ ${dadosVenda.recebido.toFixed(2)}</td>
        </tr>
        <tr>
            <td>Troco:</td>
            <td style="text-align: right; font-weight: bold;">R$ ${dadosVenda.troco.toFixed(2)}</td>
        </tr>
    ` : "";

    // Cabeçalho da loja: CNPJ e endereço só entram no cupom quando estão
    // configurados em unicka-local.properties (ver README).
    const linhaCnpj     = dadosLoja.cnpj     ? `<span style="font-size: 10px;">CNPJ: ${dadosLoja.cnpj}</span><br>` : "";
    const linhaEndereco = dadosLoja.endereco ? `<span style="font-size: 10px;">${dadosLoja.endereco}</span>` : "";

    const cupomHTML = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Cupom de Venda</title>
        <style>
            @media print {
                @page { margin: 0; size: 80mm auto; }
                body { margin: 0; }
                .btn-imprimir { display: none !important; }
            }
            body {
                font-family: "Courier New", Courier, monospace;
                font-size: 12px;
                color: #000;
                background: #fff;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
            }
            .cupom { width: 280px; padding: 10px 15px; }
            .cupom-centro { text-align: center; }
            .cupom-linha { border-top: 1px dashed #000; margin: 6px 0; }
            .cupom table { width: 100%; border-collapse: collapse; }
            .cupom td { font-size: 11px; vertical-align: top; }
            .cupom-total { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
            .cupom-pagamento { text-align: center; font-size: 13px; font-weight: bold; margin: 4px 0; }
            .cupom-rodape { text-align: center; font-size: 10px; margin-top: 10px; color: #555; }
            .btn-imprimir {
                display: block; margin: 20px auto; padding: 12px 30px;
                font-size: 16px; font-weight: bold;
                background-color: #27ae60; color: #fff;
                border: none; border-radius: 6px; cursor: pointer;
            }
            .btn-imprimir:hover { background-color: #219150; }
        </style>
    </head>
    <body>
        <div class="cupom">
            <div class="cupom-centro">
                <strong style="font-size: 14px;">${dadosLoja.nome}</strong><br>
                ${linhaCnpj}
                ${linhaEndereco}
            </div>
            <div class="cupom-linha"></div>
            <div class="cupom-centro" style="font-size: 13px; font-weight: bold;">CUPOM DE VENDA</div>
            <div class="cupom-linha"></div>
            <table>
                <tr>
                    <td>Data: ${dataStr}</td>
                    <td style="text-align: right;">Hora: ${horaStr}</td>
                </tr>
            </table>
            <div class="cupom-linha"></div>
            <table>
                <tr style="font-weight: bold; border-bottom: 1px solid #000;">
                    <td>ITEM</td>
                    <td style="text-align: right;">UNIT</td>
                    <td style="text-align: right;">TOTAL</td>
                </tr>
                ${linhasItens}
            </table>
            <div class="cupom-linha"></div>
            <table>
                <tr>
                    <td>Qtd. total de itens:</td>
                    <td style="text-align: right; font-weight: bold;">${totalItens}</td>
                </tr>
                ${linhasDesconto}
            </table>
            <div class="cupom-total">TOTAL: R$ ${dadosVenda.total.toFixed(2)}</div>
            <div class="cupom-linha"></div>
            <div class="cupom-pagamento">Pagamento: ${labelForma[dadosVenda.formaPagamento] || dadosVenda.formaPagamento}</div>
            <div class="cupom-linha"></div>
            <table>${linhaTroco}</table>
            <div class="cupom-linha"></div>
            <div class="cupom-rodape">
                Obrigado pela preferência!<br>
                Volte sempre!
            </div>
            <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir Cupom</button>
        </div>
    </body>
    </html>
    `;

    const largura  = 400;
    const altura   = 620;
    const esquerda = (screen.width  - largura) / 2;
    const topo     = (screen.height - altura)  / 2;

    const janelaImpressao = window.open("", "_blank", `width=${largura},height=${altura},left=${esquerda},top=${topo}`);
    janelaImpressao.document.write(cupomHTML);
    janelaImpressao.document.close();
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

function limparCamposBusca() {
    document.getElementById("buscaProduto").value     = "";
    document.getElementById("info-estoque").innerText  = "";
    document.getElementById("quantidade").value       = "1";
    document.getElementById("buscaProduto").focus();
}