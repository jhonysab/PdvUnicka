(function () {
    // Se a sessão do servidor expirar, qualquer chamada à API devolve 401:
    // limpa o login local e volta para a tela de entrada.
    const _fetch = window.fetch;
    window.fetch = async (...args) => {
        const resposta = await _fetch(...args);
        if (resposta.status === 401 && String(args[0]).includes("/api/")) {
            sessionStorage.clear();
            window.location.href = "index.html";
        }
        return resposta;
    };

    const LINKS = [
        { label: '🛒 Caixa',       href: 'caixa.html' },
        { label: '📦 Estoque',     href: 'estoque.html' },
        { label: '👥 Clientes',    href: 'clientes.html' },
        { label: '🎪 Pegue e Monte', href: 'locacoes.html' },
        { label: '📈 Relatórios',  href: 'relatorios.html',      adminOnly: true },
        { label: '📋 Histórico',   href: 'historico-caixa.html' },
        { label: '🏭 Fornecedores', href: 'fornecedores.html' },
        { label: '👤 Usuários',    href: 'usuarios.html',        adminOnly: true },
    ];

    const perfil = sessionStorage.getItem('perfil');
    const paginaAtual = window.location.pathname.split('/').pop();

    const marca = document.querySelector('.header-marca');
    if (marca) {
        marca.style.cursor = 'pointer';
        marca.addEventListener('click', () => window.location.href = 'index.html');
    }

    const nav = document.getElementById('nav-principal');
    if (!nav) return;

    LINKS.forEach(({ label, href, adminOnly }) => {
        if (adminOnly && perfil !== 'ADMIN') return;
        if (href === paginaAtual) return;

        const btn = document.createElement('button');
        btn.className = 'btn-nav';
        btn.textContent = label;
        btn.onclick = () => window.location.href = href;
        nav.appendChild(btn);
    });
})();
