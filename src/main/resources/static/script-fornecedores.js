(function () {
    'use strict';

    if (!sessionStorage.getItem('perfil')) {
        window.location.href = 'index.html';
    }

    const API_URL = 'http://localhost:8080/api/produtos';

    let todosGrupos = [];

    // =========================================================================
    // CARREGAMENTO
    // =========================================================================

    async function carregarFornecedores() {
        try {
            const resp     = await fetch(API_URL);
            const produtos = await resp.json();

            // Filtra VENDA AVULSA e agrupa por fornecedorNome
            const comFornecedor = produtos.filter(
                p => p.nome !== 'VENDA AVULSA' && p.fornecedorNome && p.fornecedorNome.trim()
            );
            const semFornecedor = produtos.filter(
                p => p.nome !== 'VENDA AVULSA' && (!p.fornecedorNome || !p.fornecedorNome.trim())
            );

            // Atualiza cards de resumo
            const mapa = agruparPorFornecedor(comFornecedor);
            todosGrupos = Object.values(mapa).sort((a, b) =>
                a.nome.localeCompare(b.nome)
            );

            document.getElementById('card-total-fornecedores').textContent = todosGrupos.length;
            document.getElementById('card-total-produtos').textContent      = comFornecedor.length;
            document.getElementById('card-sem-fornecedor').textContent      = semFornecedor.length;

            renderizarFornecedores(todosGrupos);

        } catch (e) {
            console.error('Erro ao carregar fornecedores:', e);
            showToast('Erro ao carregar dados', 'erro');
        }
    }

    function agruparPorFornecedor(produtos) {
        const mapa = {};
        produtos.forEach(p => {
            const chave = p.fornecedorNome.trim();
            if (!mapa[chave]) {
                mapa[chave] = {
                    nome:      chave,
                    telefone:  p.fornecedorTelefone  || null,
                    endereco:  p.fornecedorEndereco   || null,
                    pagamento: p.fornecedorPagamento  || null,
                    produtos:  [],
                };
            }
            mapa[chave].produtos.push(p);
            // Se algum produto tiver info extra, aproveita
            if (!mapa[chave].telefone && p.fornecedorTelefone) mapa[chave].telefone = p.fornecedorTelefone;
            if (!mapa[chave].endereco && p.fornecedorEndereco) mapa[chave].endereco = p.fornecedorEndereco;
            if (!mapa[chave].pagamento && p.fornecedorPagamento) mapa[chave].pagamento = p.fornecedorPagamento;
        });
        return mapa;
    }

    // =========================================================================
    // RENDERIZAÇÃO
    // =========================================================================

    function renderizarFornecedores(grupos) {
        const lista = document.getElementById('lista-fornecedores');
        const vazio = document.getElementById('sem-fornecedores');

        lista.innerHTML = '';

        if (grupos.length === 0) {
            vazio.style.display = 'block';
            return;
        }
        vazio.style.display = 'none';

        grupos.forEach(f => {
            const pagLabel = {
                DINHEIRO: 'Dinheiro', PIX: 'PIX', BOLETO: 'Boleto',
                CREDITO: 'Cartão Crédito', DEBITO: 'Cartão Débito',
            }[f.pagamento] || f.pagamento;

            const contatosHtml = [
                f.telefone ? `<div class="contato-item"><span class="icone">📞</span>${f.telefone}</div>` : '',
                f.endereco ? `<div class="contato-item"><span class="icone">📍</span>${f.endereco}</div>` : '',
            ].join('');

            const produtosHtml = f.produtos.map(p => {
                const estoqueClass = p.estoque <= 2 ? 'estoque-critico' :
                                     p.estoque <= 10 ? 'estoque-medio' : '';
                return `
                    <div class="produto-fornecedor-linha">
                        <span class="produto-fornecedor-nome">${p.nome}</span>
                        <div class="produto-fornecedor-info">
                            <span class="produto-fornecedor-preco">R$ ${p.preco.toFixed(2)}</span>
                            <span class="produto-fornecedor-estoque ${estoqueClass}">${p.estoque} em estoque</span>
                        </div>
                    </div>`;
            }).join('');

            lista.innerHTML += `
                <div class="card-fornecedor">
                    <div class="card-fornecedor-header">
                        <div class="card-fornecedor-nome">🏭 ${f.nome}</div>
                        <div class="card-fornecedor-meta">
                            ${pagLabel ? `<span class="badge-pagamento">${pagLabel}</span>` : ''}
                            <span class="badge-qtd-produtos">${f.produtos.length} produto${f.produtos.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    ${contatosHtml ? `<div class="card-fornecedor-contatos">${contatosHtml}</div>` : ''}
                    <div class="card-fornecedor-produtos">
                        <h4>Produtos deste fornecedor</h4>
                        ${produtosHtml}
                    </div>
                </div>`;
        });
    }

    // =========================================================================
    // FILTRO
    // =========================================================================

    window.filtrarFornecedores = function () {
        const termo    = document.getElementById('busca-fornecedor').value.toLowerCase();
        const pagFiltro = document.getElementById('filtro-pagamento').value;

        const filtrados = todosGrupos.filter(f => {
            const matchBusca = !termo ||
                f.nome.toLowerCase().includes(termo) ||
                (f.telefone && f.telefone.toLowerCase().includes(termo)) ||
                (f.endereco && f.endereco.toLowerCase().includes(termo));

            const matchPag = !pagFiltro || f.pagamento === pagFiltro;

            return matchBusca && matchPag;
        });

        renderizarFornecedores(filtrados);
    };

    carregarFornecedores();
})();
