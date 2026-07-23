// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

const API_LOCACOES = "http://localhost:8080/api/locacoes";
const API_CLIENTES = "http://localhost:8080/api/clientes";

let todasLocacoes = [];
let todosClientes = [];
let filtroAtual   = "TODOS";

const STATUS_LABELS = {
    RESERVADO:  { label: "Reservado",  classe: "status-reservado",  icone: "📋" },
    ENTREGUE:   { label: "Entregue",   classe: "status-entregue",   icone: "🚚" },
    DEVOLVIDO:  { label: "Devolvido",  classe: "status-devolvido",  icone: "✅" },
    CANCELADO:  { label: "Cancelado",  classe: "status-cancelado",  icone: "❌" },
};

// ADMIN + FUNCIONARIO
const _perfil = sessionStorage.getItem("perfil");
if (!_perfil) window.location.href = "index.html";

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

carregarDados();

async function carregarDados() {
    await Promise.all([carregarLocacoes(), carregarClientes()]);
    carregarProximos();
}

// =============================================================================
// BUSCA DE DADOS
// =============================================================================

async function carregarLocacoes() {
    try {
        const resposta = await fetch(API_LOCACOES);
        todasLocacoes  = await resposta.json();
        atualizarCards();
        renderizarLocacoes();
    } catch (erro) {
        console.error("Erro ao carregar locações:", erro);
    }
}

async function carregarClientes() {
    try {
        const resposta = await fetch(API_CLIENTES);
        todosClientes  = await resposta.json();
        preencherSelectClientes();
    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);
    }
}

async function carregarProximos() {
    try {
        const resposta = await fetch(`${API_LOCACOES}/proximas?dias=7`);
        const proximos = await resposta.json();
        renderizarAlertas(proximos);
    } catch (erro) {
        console.error("Erro ao carregar próximos:", erro);
    }
}

// =============================================================================
// CARDS
// =============================================================================

function atualizarCards() {
    const reservados = todasLocacoes.filter((l) => l.status === "RESERVADO").length;
    const entregues  = todasLocacoes.filter((l) => l.status === "ENTREGUE").length;

    document.getElementById("card-reservados").innerText    = reservados;
    document.getElementById("card-entregues").innerText     = entregues;
    document.getElementById("card-total-locacoes").innerText = todasLocacoes.length;
}

// =============================================================================
// ALERTAS DE EVENTOS PRÓXIMOS
// =============================================================================

function renderizarAlertas(proximos) {
    const container = document.getElementById("alertas-proximos");
    const lista     = document.getElementById("alertas-lista");

    if (proximos.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    lista.innerHTML = "";

    proximos.forEach((l) => {
        const dataEvento   = new Date(l.dataEvento + "T12:00:00").toLocaleDateString("pt-BR");
        const hoje         = new Date();
        const evento       = new Date(l.dataEvento + "T12:00:00");
        const diasRestando = Math.ceil((evento - hoje) / (1000 * 60 * 60 * 24));
        const urgencia     = diasRestando <= 2 ? "alerta-urgente" : "alerta-normal";
        const clienteNome  = l.cliente ? l.cliente.nome : "Sem cliente";

        lista.innerHTML += `
            <div class="alerta-item ${urgencia}">
                <div class="alerta-info">
                    <strong>${l.tema}</strong> — ${clienteNome}
                    <br><small>${l.enderecoEntrega || "Endereço não informado"}</small>
                </div>
                <div class="alerta-data">
                    <span class="alerta-dia">${dataEvento}</span>
                    <span class="alerta-countdown">${diasRestando === 0 ? "HOJE!" : diasRestando === 1 ? "AMANHÃ" : `em ${diasRestando} dias`}</span>
                </div>
            </div>
        `;
    });
}

// =============================================================================
// FILTRO E RENDERIZAÇÃO
// =============================================================================

function filtrarPorStatus(status, botao) {
    filtroAtual = status;

    document.querySelectorAll(".btn-filtro").forEach((b) => b.classList.remove("ativo"));
    if (botao) botao.classList.add("ativo");

    renderizarLocacoes();
}

function renderizarLocacoes() {
    const container = document.getElementById("lista-locacoes");
    container.innerHTML = "";

    let filtradas = todasLocacoes;
    if (filtroAtual !== "TODOS") {
        filtradas = filtradas.filter((l) => l.status === filtroAtual);
    }

    // Ordena: mais próximos primeiro
    filtradas.sort((a, b) => new Date(a.dataEvento) - new Date(b.dataEvento));

    if (filtradas.length === 0) {
        container.innerHTML = '<p class="lista-vazia">Nenhuma locação encontrada.</p>';
        return;
    }

    filtradas.forEach((l) => {
        const status      = STATUS_LABELS[l.status] || STATUS_LABELS.RESERVADO;
        const clienteNome = l.cliente ? l.cliente.nome : "Sem cliente";
        const dataEvento  = l.dataEvento ? new Date(l.dataEvento + "T12:00:00").toLocaleDateString("pt-BR") : "-";
        const dataEntrega = l.dataEntrega ? new Date(l.dataEntrega + "T12:00:00").toLocaleDateString("pt-BR") : "-";
        const dataDev     = l.dataDevolucao ? new Date(l.dataDevolucao + "T12:00:00").toLocaleDateString("pt-BR") : "-";

        // Botões de ação por status
        let acoesHTML = "";
        if (l.status === "RESERVADO") {
            acoesHTML = `
                <button class="btn-status btn-entregar" onclick="alterarStatus(${l.id}, 'ENTREGUE')">🚚 Marcar Entregue</button>
                <button class="btn-status btn-cancelar-loc" onclick="alterarStatus(${l.id}, 'CANCELADO')">Cancelar</button>
            `;
        } else if (l.status === "ENTREGUE") {
            acoesHTML = `<button class="btn-status btn-devolver" onclick="alterarStatus(${l.id}, 'DEVOLVIDO')">✅ Marcar Devolvido</button>`;
        }

        container.innerHTML += `
            <div class="locacao-card">
                <div class="locacao-header">
                    <div class="locacao-tema">
                        <span class="locacao-tema-nome">${l.tema}</span>
                        <span class="locacao-status ${status.classe}">${status.icone} ${status.label}</span>
                    </div>
                    <span class="locacao-valor">R$ ${l.valor.toFixed(2)}</span>
                </div>

                <div class="locacao-detalhes">
                    <div class="locacao-detalhe"><span class="locacao-label">Cliente:</span> ${clienteNome}</div>
                    <div class="locacao-detalhe"><span class="locacao-label">Evento:</span> ${dataEvento}</div>
                    <div class="locacao-detalhe"><span class="locacao-label">Entrega:</span> ${dataEntrega}</div>
                    <div class="locacao-detalhe"><span class="locacao-label">Devolução:</span> ${dataDev}</div>
                    <div class="locacao-detalhe"><span class="locacao-label">Endereço:</span> ${l.enderecoEntrega || "-"}</div>
                    ${l.observacoes ? `<div class="locacao-detalhe locacao-obs"><span class="locacao-label">Obs:</span> ${l.observacoes}</div>` : ""}
                </div>

                <div class="locacao-acoes">
                    ${acoesHTML}
                    <button class="btn-status btn-editar-loc" onclick="editarLocacao(${l.id})">✏️ Editar</button>
                    <button class="btn-status btn-excluir-loc" onclick="excluirLocacao(${l.id})">🗑️</button>
                </div>
            </div>
        `;
    });
}

// =============================================================================
// MODAL NOVA/EDITAR LOCAÇÃO
// =============================================================================

function preencherSelectClientes() {
    const select = document.getElementById("locCliente");
    select.innerHTML = '<option value="">Selecionar cliente...</option>';
    todosClientes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach((c) => {
        select.innerHTML += `<option value="${c.id}" data-endereco="${c.endereco || ""}">${c.nome} — ${c.cpf || "sem CPF"}</option>`;
    });

    // Quando seleciona cliente, preenche endereço
    select.addEventListener("change", () => {
        const opt = select.options[select.selectedIndex];
        const end = opt.dataset.endereco || "";
        const inputEnd = document.getElementById("locEndereco");
        if (end && !inputEnd.value) inputEnd.value = end;
    });
}

function abrirModalLocacao() {
    document.getElementById("modal-locacao-titulo").innerText = "Nova Locação";
    document.getElementById("locacaoId").value       = "";
    document.getElementById("locCliente").value      = "";
    document.getElementById("locTema").value          = "";
    document.getElementById("locValor").value         = "";
    document.getElementById("locPagamento").value     = "";
    document.getElementById("locDataEvento").value    = "";
    document.getElementById("locDataEntrega").value   = "";
    document.getElementById("locDataDevolucao").value = "";
    document.getElementById("locEndereco").value      = "";
    document.getElementById("locObs").value           = "";

    document.getElementById("btn-salvar-locacao").innerText = "Reservar Locação";
    document.getElementById("modalLocacao").style.display   = "flex";
    document.getElementById("locCliente").focus();
}

function fecharModalLocacao() {
    document.getElementById("modalLocacao").style.display = "none";
}

function editarLocacao(id) {
    const l = todasLocacoes.find((loc) => loc.id === id);
    if (!l) return;

    document.getElementById("modal-locacao-titulo").innerText = "Editar Locação";
    document.getElementById("locacaoId").value       = l.id;
    document.getElementById("locCliente").value      = l.cliente ? l.cliente.id : "";
    document.getElementById("locTema").value          = l.tema || "";
    document.getElementById("locValor").value         = l.valor || "";
    document.getElementById("locPagamento").value     = l.formaPagamento || "";
    document.getElementById("locDataEvento").value    = l.dataEvento || "";
    document.getElementById("locDataEntrega").value   = l.dataEntrega || "";
    document.getElementById("locDataDevolucao").value = l.dataDevolucao || "";
    document.getElementById("locEndereco").value      = l.enderecoEntrega || "";
    document.getElementById("locObs").value           = l.observacoes || "";

    document.getElementById("btn-salvar-locacao").innerText = "Salvar Alterações";
    document.getElementById("modalLocacao").style.display   = "flex";
}

async function salvarLocacao() {
    const id = document.getElementById("locacaoId").value;
    const clienteId   = document.getElementById("locCliente").value;
    const tema        = document.getElementById("locTema").value.trim();
    const valor       = parseFloat(document.getElementById("locValor").value);
    const pagamento   = document.getElementById("locPagamento").value;
    const dataEvento  = document.getElementById("locDataEvento").value;
    const dataEntrega = document.getElementById("locDataEntrega").value || null;
    const dataDev     = document.getElementById("locDataDevolucao").value || null;
    const endereco    = document.getElementById("locEndereco").value.trim();
    const obs         = document.getElementById("locObs").value.trim();

    if (!tema) { alert("Informe o tema!"); return; }
    if (!dataEvento) { alert("Informe a data do evento!"); return; }
    if (!valor || valor <= 0) { alert("Informe o valor!"); return; }

    const dados = {
        tema, valor, dataEvento,
        dataEntrega:     dataEntrega,
        dataDevolucao:   dataDev,
        enderecoEntrega: endereco || null,
        formaPagamento:  pagamento || null,
        observacoes:     obs || null,
    };

    if (clienteId) dados.cliente = { id: parseInt(clienteId) };
    if (id) dados.id = parseInt(id);

    // Preserva status na edição
    if (id) {
        const original = todasLocacoes.find((l) => l.id === parseInt(id));
        if (original) dados.status = original.status;
    }

    try {
        const resposta = await fetch(API_LOCACOES, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
        });

        if (resposta.ok) {
            alert(id ? "Locação atualizada!" : "Locação reservada com sucesso!");
            fecharModalLocacao();
            carregarDados();
        } else {
            alert("Erro: " + await resposta.text());
        }
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
    }
}

// =============================================================================
// ALTERAÇÃO DE STATUS
// =============================================================================

async function alterarStatus(id, novoStatus) {
    const labels = { ENTREGUE: "entregue", DEVOLVIDO: "devolvido", CANCELADO: "cancelada" };
    if (!confirm(`Marcar como ${labels[novoStatus]}?`)) return;

    try {
        const resposta = await fetch(`${API_LOCACOES}/${id}/status?status=${novoStatus}`, { method: "PATCH" });
        if (resposta.ok) {
            carregarDados();
        } else {
            alert("Erro ao alterar status.");
        }
    } catch (erro) {
        console.error("Erro:", erro);
    }
}

// =============================================================================
// EXCLUSÃO
// =============================================================================

async function excluirLocacao(id) {
    if (!confirm("Excluir esta locação?")) return;

    try {
        const resposta = await fetch(`${API_LOCACOES}/${id}`, { method: "DELETE" });
        if (resposta.ok) carregarDados();
    } catch (erro) {
        console.error("Erro:", erro);
    }
}