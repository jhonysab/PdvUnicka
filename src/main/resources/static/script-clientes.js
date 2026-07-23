// =============================================================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// =============================================================================

const API_CLIENTES = "http://localhost:8080/api/clientes";
const API_VENDAS   = "http://localhost:8080/api/vendas";

let todosClientes     = [];
let clientesFiltrados = [];
let paginaAtual       = 1;

const ITENS_POR_PAGINA = 8;

const _perfil = sessionStorage.getItem("perfil");
if (!_perfil) window.location.href = "index.html";

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

carregarClientes();

// =============================================================================
// BUSCA DE DADOS
// =============================================================================

async function carregarClientes() {
    try {
        const resposta = await fetch(API_CLIENTES);
        todosClientes  = await resposta.json();
        document.getElementById("card-total-clientes").innerText = todosClientes.length;
        filtrarClientes();
    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);
    }
}

// =============================================================================
// FILTRO E PAGINAÇÃO
// =============================================================================

function filtrarClientes() {
    const termo = document.getElementById("barra-pesquisa").value.toLowerCase();

    clientesFiltrados = todosClientes.filter((c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.cpf || "").includes(termo) ||
        (c.telefone || "").includes(termo)
    );

    clientesFiltrados.sort((a, b) => a.nome.localeCompare(b.nome));

    const totalPaginas = Math.ceil(clientesFiltrados.length / ITENS_POR_PAGINA) || 1;
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    document.getElementById("info-paginas").innerText = `Página ${paginaAtual} de ${totalPaginas}`;

    const inicio           = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const clientesDaPagina = clientesFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);

    renderizarTabela(clientesDaPagina);
}

function paginaAnterior() {
    if (paginaAtual > 1) { paginaAtual--; filtrarClientes(); }
}

function proximaPagina() {
    if (paginaAtual * ITENS_POR_PAGINA < clientesFiltrados.length) { paginaAtual++; filtrarClientes(); }
}

// =============================================================================
// RENDERIZAÇÃO DA TABELA
// =============================================================================

function renderizarTabela(clientes) {
    const tbody     = document.getElementById("tabela-clientes");
    tbody.innerHTML = "";

    if (clientes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="td-vazio">Nenhum cliente encontrado.</td>
            </tr>
        `;
        return;
    }

    clientes.forEach((c) => {
        const dataCadastro = c.dataCadastro
            ? new Date(c.dataCadastro).toLocaleDateString("pt-BR")
            : "-";

        const nomeEscapado     = (c.nome || "").replace(/'/g, "\\'");
        const cpfEscapado      = (c.cpf || "").replace(/'/g, "\\'");
        const telefoneEscapado = (c.telefone || "").replace(/'/g, "\\'");
        const enderecoEscapado = (c.endereco || "").replace(/'/g, "\\'");

        tbody.innerHTML += `
            <tr>
                <td class="td-nome">${c.nome}</td>
                <td>${c.cpf || "-"}</td>
                <td>${c.telefone || "-"}</td>
                <td class="td-endereco">${c.endereco || "-"}</td>
                <td class="td-data">${dataCadastro}</td>
                <td class="col-acoes">
                    <button class="btn-editar" onclick="prepararEdicao(${c.id}, '${nomeEscapado}', '${cpfEscapado}', '${telefoneEscapado}', '${enderecoEscapado}')">Editar</button>
                    <button class="btn-excluir" style="color:var(--accent);border-color:var(--accent);" onclick="verHistorico(${c.id}, '${nomeEscapado}')">Histórico</button>
                    <button class="btn-excluir" onclick="excluirCliente(${c.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

// =============================================================================
// HISTÓRICO DE COMPRAS
// =============================================================================

async function verHistorico(clienteId, nomeCliente) {
    const secao  = document.getElementById("secao-historico-cliente");
    const titulo = document.getElementById("titulo-historico-cliente");
    const lista  = document.getElementById("lista-historico-cliente");

    titulo.innerText    = `Histórico de Compras — ${nomeCliente}`;
    lista.innerHTML     = '<p class="historico-cliente-vazia">Carregando...</p>';
    secao.style.display = "block";
    secao.scrollIntoView({ behavior: "smooth" });

    try {
        const resposta = await fetch(`${API_VENDAS}/cliente/${clienteId}`);
        const vendas   = await resposta.json();

        if (!vendas.length) {
            lista.innerHTML = '<p class="historico-cliente-vazia">Nenhuma compra registrada para este cliente.</p>';
            return;
        }

        const fmt = (v) => `R$ ${v.toFixed(2)}`;
        const fmtData = (d) => new Date(d).toLocaleString("pt-BR");

        lista.innerHTML = vendas.map((v) => {
            const itens = v.itens
                ? v.itens.map((i) => `${i.quantidade}x ${i.descricao || i.produto.nome}`).join(", ")
                : "—";
            return `
                <div class="historico-cliente-card">
                    <span class="historico-cliente-data">${fmtData(v.dataHora)}</span>
                    <span class="historico-cliente-itens">${itens}</span>
                    <span class="historico-cliente-valor">${fmt(v.valorTotal)}</span>
                </div>`;
        }).join("");

    } catch (e) {
        lista.innerHTML = '<p class="historico-cliente-vazia">Erro ao carregar histórico.</p>';
    }
}

// =============================================================================
// CADASTRO E EDIÇÃO
// =============================================================================

async function salvarCliente() {
    const id       = document.getElementById("clienteId").value;
    const nome     = document.getElementById("clienteNome").value.trim();
    const cpf      = document.getElementById("clienteCpf").value.trim();
    const telefone = document.getElementById("clienteTelefone").value.trim();
    const endereco = document.getElementById("clienteEndereco").value.trim();

    if (!nome) {
        showToast("O nome do cliente é obrigatório!", "aviso");
        document.getElementById("clienteNome").focus();
        return;
    }

    const clienteData = { nome, cpf, telefone, endereco };
    if (id) clienteData.id = parseInt(id);

    try {
        const resposta = await fetch(API_CLIENTES, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(clienteData),
        });

        if (resposta.ok) {
            showToast(id ? "Cliente atualizado!" : "Cliente cadastrado!", "sucesso");
            limparFormulario();
            carregarClientes();
        } else {
            const erro = await resposta.text();
            showToast("Erro ao salvar: " + erro, "erro");
        }
    } catch (erro) {
        console.error("Erro ao salvar cliente:", erro);
    }
}

function prepararEdicao(id, nome, cpf, telefone, endereco) {
    document.getElementById("clienteId").value        = id;
    document.getElementById("clienteNome").value       = nome;
    document.getElementById("clienteCpf").value        = cpf;
    document.getElementById("clienteTelefone").value   = telefone;
    document.getElementById("clienteEndereco").value   = endereco;

    const btnSalvar  = document.getElementById("btn-salvar-cliente");
    btnSalvar.innerText = "Salvar Alterações";
    btnSalvar.classList.add("modo-edicao");

    document.getElementById("btn-cancelar-edicao").style.display = "inline-block";
    document.getElementById("clienteNome").focus();

    document.querySelector(".secao-cadastro").scrollIntoView({ behavior: "smooth" });
}

window.prepararEdicao = prepararEdicao;

function cancelarEdicao() {
    limparFormulario();
}

function limparFormulario() {
    ["clienteId", "clienteNome", "clienteCpf", "clienteTelefone", "clienteEndereco"].forEach(
        (id) => (document.getElementById(id).value = "")
    );

    const btnSalvar = document.getElementById("btn-salvar-cliente");
    btnSalvar.innerText = "Cadastrar Cliente";
    btnSalvar.classList.remove("modo-edicao");

    document.getElementById("btn-cancelar-edicao").style.display = "none";
}

// =============================================================================
// EXCLUSÃO
// =============================================================================

async function excluirCliente(id) {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
        const resposta = await fetch(`${API_CLIENTES}/${id}`, { method: "DELETE" });

        if (resposta.ok) {
            showToast("Cliente removido!", "sucesso");
            carregarClientes();
        } else {
            const erroTexto = await resposta.text();
            showToast(erroTexto || "Erro ao excluir cliente.", "erro");
        }
    } catch (erro) {
        console.error("Erro ao excluir cliente:", erro);
    }
}

// =============================================================================
// MÁSCARAS DE INPUT
// =============================================================================

function mascaraCPF(input) {
    let v = input.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    input.value = v;
}

function mascaraTelefone(input) {
    let v = input.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6)      v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, "($1) $2-$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, "($1) $2");
    else if (v.length > 0) v = v.replace(/(\d{1,2})/, "($1");
    input.value = v;
}
