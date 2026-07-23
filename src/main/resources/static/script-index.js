const API_AUTH = "http://localhost:8080/api/auth";

// Módulos por perfil
const MODULOS = {
    ADMIN: [
        { icon: "🛒", titulo: "Caixa",          sub: "Frente de vendas",        href: "caixa.html"        },
        { icon: "📦", titulo: "Estoque",         sub: "Produtos e cadastros",    href: "estoque.html"      },
        { icon: "👥", titulo: "Clientes",        sub: "Cadastro de clientes",    href: "clientes.html"     },
        { icon: "🎪", titulo: "Pegue e Monte",   sub: "Locações e entregas",     href: "locacoes.html"     },
        { icon: "🏭", titulo: "Fornecedores",    sub: "Cadastro de fornecedores",href: "fornecedores.html" },
        { icon: "📈", titulo: "Relatórios",      sub: "Análise de vendas",       href: "relatorios.html"   },
        { icon: "🔒", titulo: "Caixas",          sub: "Histórico de turnos",     href: "historico-caixa.html"       },
        { icon: "👤", titulo: "Usuários",        sub: "Gerenciar equipe",        href: "#usuarios"         },
        { icon: "💾", titulo: "Backup",          sub: "Cópia de segurança",      href: "#backup"           },
    ],
    FUNCIONARIO: [
        { icon: "🛒", titulo: "Caixa",          sub: "Frente de vendas",        href: "caixa.html"    },
        { icon: "📦", titulo: "Estoque",         sub: "Consultar produtos",      href: "estoque.html"  },
        { icon: "👥", titulo: "Clientes",        sub: "Cadastro de clientes",    href: "clientes.html" },
        { icon: "🎪", titulo: "Pegue e Monte",   sub: "Locações e entregas",     href: "locacoes.html" },
        { icon: "🏭", titulo: "Fornecedores",    sub: "Cadastro de fornecedores",href: "fornecedores.html" },
        { icon: "🔒", titulo: "Caixas",          sub: "Histórico de turnos",     href: "historico-caixa.html" },
    ],
};

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

window.addEventListener("DOMContentLoaded", () => {
    const perfil   = sessionStorage.getItem("perfil");
    const username = sessionStorage.getItem("username");

    if (perfil && username) {
        exibirHub(username, perfil);
    } else {
        document.getElementById("tela-auth").style.display = "flex";
    }
});

// =============================================================================
// LOGIN
// (cadastro de usuários fica na tela "Usuários" do hub, restrita ao admin)
// =============================================================================

async function fazerLogin() {
    const username = document.getElementById("login-username").value.trim();
    const senha    = document.getElementById("login-senha").value;
    const erroEl   = document.getElementById("login-erro");

    if (!username || !senha) {
        erroEl.innerText = "Preencha usuário e senha.";
        return;
    }

    try {
        const resp = await fetch(`${API_AUTH}/login`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ username, senha }),
        });

        if (resp.ok) {
            const dados = await resp.json();
            sessionStorage.setItem("username", dados.username);
            sessionStorage.setItem("perfil",   dados.perfil);

            document.getElementById("tela-auth").style.display = "none";
            exibirHub(dados.username, dados.perfil);
        } else {
            const msg = await resp.text();
            erroEl.innerText = msg || "Usuário ou senha incorretos.";
        }
    } catch (erro) {
        erroEl.innerText = "Erro de conexão com o servidor.";
    }
}

// =============================================================================
// HUB
// =============================================================================

function exibirHub(username, perfil) {
    document.getElementById("tela-hub").style.display = "block";
    document.getElementById("hub-nome-usuario").innerText = username;

    const badge = document.getElementById("hub-badge-perfil");
    badge.innerText   = perfil === "ADMIN" ? "Admin" : "Funcionário";
    badge.className   = `badge-perfil ${perfil === "ADMIN" ? "badge-admin" : "badge-func"}`;

    const modulos  = MODULOS[perfil] || MODULOS.FUNCIONARIO;
    const cards    = document.getElementById("hub-cards");
    cards.innerHTML = "";

    modulos.forEach((m) => {
        const card = document.createElement("div");
        card.className = "hub-card";
        card.onclick   = () => {
            if (m.href === "#usuarios")     abrirGerenciarUsuarios();
            else if (m.href === "#backup")  fazerBackupManual(card);
            else window.location.href = m.href;
        };
        card.innerHTML = `
            <div class="hub-card-icon">${m.icon}</div>
            <div class="hub-card-titulo">${m.titulo}</div>
            <div class="hub-card-sub">${m.sub}</div>
        `;
        cards.appendChild(card);
    });
}

function logout() {
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("perfil");
    // Encerra a sessão no servidor também
    fetch(`${API_AUTH}/logout`, { method: "POST" }).finally(() => window.location.reload());
}

function abrirGerenciarUsuarios() {
    // Placeholder — pode virar modal futuramente
    window.location.href = "usuarios.html";
}

// =============================================================================
// BACKUP MANUAL
// =============================================================================

async function fazerBackupManual(card) {
    const sub = card.querySelector(".hub-card-sub");
    const textoOriginal = sub.innerText;
    sub.innerText = "Gerando backup...";

    try {
        const resp = await fetch("http://localhost:8080/api/backup", { method: "POST" });

        if (resp.ok) {
            const dados = await resp.json();
            sub.innerText = "✅ Backup criado!";
            alert(`Backup criado com sucesso!\n\nArquivo: ${dados.arquivo}\nPasta: ${dados.pasta}`);
        } else {
            const msg = await resp.text();
            sub.innerText = "❌ Falhou";
            alert("Erro ao gerar backup: " + msg);
        }
    } catch (erro) {
        sub.innerText = "❌ Sem conexão";
        alert("Erro de conexão ao gerar o backup.");
    }

    setTimeout(() => { sub.innerText = textoOriginal; }, 4000);
}