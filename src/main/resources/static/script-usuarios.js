// ── Auth guard ──
const _perfil = sessionStorage.getItem("perfil");
const _username = sessionStorage.getItem("username");
if (!_perfil || _perfil !== "ADMIN") {
    window.location.href = "index.html";
}

const API = "/api/auth";

// ── Elementos ──
const tbody = document.getElementById("tbody-usuarios");
const inpUsername = document.getElementById("inp-username");
const inpSenha = document.getElementById("inp-senha");
const selPerfil = document.getElementById("sel-perfil");
const btnCadastrar = document.getElementById("btn-cadastrar");
const formMsg = document.getElementById("form-msg");

const modalEditar = document.getElementById("modal-editar");
const modalExcluir = document.getElementById("modal-excluir");

let editandoId = null;
let excluindoId = null;

// ── Listar ──
async function carregarUsuarios() {
    try {
        const resp = await fetch(`${API}/usuarios`);
        if (!resp.ok) throw new Error("Erro ao buscar usuários");
        const lista = await resp.json();
        renderTabela(lista);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" class="td-vazio">Erro ao carregar usuários</td></tr>`;
    }
}

function renderTabela(lista) {
    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="td-vazio">Nenhum usuário cadastrado</td></tr>`;
        return;
    }
    tbody.innerHTML = lista.map(u => {
        const isMe = u.username === _username;
        const badgeClass = u.perfil === "ADMIN" ? "badge-admin" : "badge-func";
        const perfilLabel = u.perfil === "ADMIN" ? "Admin" : "Funcionário";
        return `
        <tr>
            <td>${u.id}</td>
            <td>${esc(u.username)}${isMe ? ' <span class="text-dim">(você)</span>' : ''}</td>
            <td><span class="badge ${badgeClass}">${perfilLabel}</span></td>
            <td>
                <div class="acoes">
                    <button class="btn-editar" onclick="abrirEditar(${u.id},'${esc(u.username)}','${u.perfil}')">Editar</button>
                    ${isMe ? '' : `<button class="btn-excluir" onclick="abrirExcluir(${u.id},'${esc(u.username)}')">Excluir</button>`}
                </div>
            </td>
        </tr>`;
    }).join("");
}

// ── Cadastrar ──
btnCadastrar.addEventListener("click", async () => {
    const username = inpUsername.value.trim();
    const senha = inpSenha.value.trim();
    const perfil = selPerfil.value;

    if (!username || !senha) {
        mostrarMsg(formMsg, "Preencha todos os campos.", "erro");
        return;
    }

    try {
        const resp = await fetch(`${API}/cadastrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Username": _username },
            body: JSON.stringify({ username, senha, perfil })
        });
        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(txt || "Erro ao cadastrar");
        }
        mostrarMsg(formMsg, "Usuário cadastrado com sucesso!", "ok");
        inpUsername.value = "";
        inpSenha.value = "";
        selPerfil.value = "FUNCIONARIO";
        carregarUsuarios();
    } catch (e) {
        mostrarMsg(formMsg, e.message, "erro");
    }
});

// ── Editar ──
function abrirEditar(id, username, perfil) {
    editandoId = id;
    document.getElementById("modal-username-label").textContent = `Editando: ${username}`;
    document.getElementById("edit-perfil").value = perfil;
    document.getElementById("edit-senha").value = "";
    document.getElementById("edit-msg").textContent = "";
    modalEditar.classList.add("aberto");
}

document.getElementById("btn-cancel-edit").addEventListener("click", () => {
    modalEditar.classList.remove("aberto");
});

document.getElementById("btn-salvar-edit").addEventListener("click", async () => {
    const perfil = document.getElementById("edit-perfil").value;
    const senha = document.getElementById("edit-senha").value.trim();
    const editMsg = document.getElementById("edit-msg");

    const body = { perfil };
    if (senha) body.senha = senha;

    try {
        const resp = await fetch(`${API}/usuarios/${editandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!resp.ok) throw new Error("Erro ao salvar");
        modalEditar.classList.remove("aberto");
        carregarUsuarios();
    } catch (e) {
        mostrarMsg(editMsg, e.message, "erro");
    }
});

// ── Excluir ──
function abrirExcluir(id, username) {
    excluindoId = id;
    document.getElementById("excluir-nome").textContent = username;
    modalExcluir.classList.add("aberto");
}

document.getElementById("btn-cancel-del").addEventListener("click", () => {
    modalExcluir.classList.remove("aberto");
});

document.getElementById("btn-confirmar-del").addEventListener("click", async () => {
    try {
        const resp = await fetch(`${API}/usuarios/${excluindoId}`, {
            method: "DELETE",
            headers: { "X-Username": _username }
        });
        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(txt || "Erro ao excluir");
        }
        modalExcluir.classList.remove("aberto");
        carregarUsuarios();
    } catch (e) {
        alert(e.message || "Erro ao excluir usuário.");
    }
});

// Fechar modais clicando fora
modalEditar.addEventListener("click", e => { if (e.target === modalEditar) modalEditar.classList.remove("aberto"); });
modalExcluir.addEventListener("click", e => { if (e.target === modalExcluir) modalExcluir.classList.remove("aberto"); });

// ── Helpers ──
function mostrarMsg(el, texto, tipo) {
    el.textContent = texto;
    el.className = "form-msg " + tipo;
    if (tipo === "ok") setTimeout(() => { el.textContent = ""; el.className = "form-msg"; }, 3000);
}

function esc(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

// ── Init ──
carregarUsuarios();