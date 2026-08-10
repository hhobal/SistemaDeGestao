// ======================================
// PRODUTOS / SERVIÇOS
// ======================================

let produtos = [];
const PRODUTOS_POR_PAGINA = 10;
let paginaAtualProdutos = 1;

const CATEGORIAS_PRODUTO = ['Peças','Serviço de mão de obra','Insumos','Equipamentos','Acessórios','Outros'];

function mudarPaginaProdutos(p) {
    const total = Math.ceil(_filtrarProdutos().length / PRODUTOS_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaAtualProdutos = p;
    renderizarProdutos();
}

function _filtrarProdutos() {
    const filtro = (document.getElementById('pesquisaProdutos')?.value || '').toLowerCase();
    const catFiltro = document.getElementById('filtroCategoriaProduto')?.value || '';
    return produtos.filter(p =>
        ((p.nome||'').toLowerCase().includes(filtro) || (p.codigo||'').toLowerCase().includes(filtro)) &&
        (catFiltro ? p.categoria === catFiltro : true)
    );
}

async function renderizarProdutos() {
    produtos = await carregarProdutosDoBanco();
    _desenharTabelaProdutos();
}

function _desenharTabelaProdutos() {
    const tabela = document.getElementById('tabelaProdutos');
    if (!tabela) return;

    const filtrados = _filtrarProdutos();
    const inicio = (paginaAtualProdutos - 1) * PRODUTOS_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + PRODUTOS_POR_PAGINA);
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum produto encontrado.', 'fa-cubes', 'Clique em "+ Novo Produto" para cadastrar.');
    } else {
        tabela.innerHTML = pagina.map(p => {
            const estq = Number(p.estoque || 0);
            const min  = Number(p.estoqueMin || 0);
            const corEstq = min > 0 && estq <= min ? 'var(--danger)' : estq <= min * 1.5 + 5 ? 'var(--warning)' : 'var(--success)';
            const margem = p.preco && p.custo ? (((p.preco - p.custo) / p.preco) * 100).toFixed(0) : null;
            return `
            <tr>
                <td>${p.codigo ? `<span style="font-family:monospace;font-size:12px">${p.codigo}</span>` : `<span style="color:var(--text-muted)">—</span>`}</td>
                <td><strong>${p.nome}</strong></td>
                <td><span class="tag">${p.categoria || '—'}</span></td>
                <td>${fmt(p.preco)}${margem ? `<br><span style="font-size:11px;color:var(--success)">${margem}% margem</span>` : ''}</td>
                <td style="color:${corEstq};font-weight:600">${estq}${min > 0 && estq <= min ? ' <i class="fa-solid fa-triangle-exclamation" style="font-size:10px"></i>' : ''}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="abrirModalProduto(${p.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirProduto(${p.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    renderizarPaginacao('paginacaoProdutos', filtrados.length, PRODUTOS_POR_PAGINA, paginaAtualProdutos, 'mudarPaginaProdutos');

    // Preencher filtro de categorias
    const sel = document.getElementById('filtroCategoriaProduto');
    if (sel && sel.children.length <= 1) {
        const cats = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
        cats.forEach(c => { sel.innerHTML += `<option value="${c}">${c}</option>`; });
    }
}

async function salvarProduto() {
    if (!validarCampos([{ id: 'produtoNome' }, { id: 'produtoPreco' }])) return;

    const modal = document.getElementById('modalProduto');
    const editId = modal._editId;

    const dados = {
        nome:        document.getElementById('produtoNome').value.trim(),
        categoria:   document.getElementById('produtoCategoria').value,
        preco:       parseFloat(document.getElementById('produtoPreco').value) || 0,
        custo:       parseFloat(document.getElementById('produtoCusto').value) || 0,
        estoque:     parseInt(document.getElementById('produtoEstoque').value) || 0,
        estoqueMin:  parseInt(document.getElementById('produtoEstoqueMin').value) || 0,
        codigo:      document.getElementById('produtoCodigo').value.trim(),
        descricao:   document.getElementById('produtoDescricao').value.trim()
    };

    try {
        await salvarProdutoNoBanco(dados, editId);
        fecharModalProduto();
        await renderizarProdutos();
        if (typeof atualizarTudo === 'function') atualizarTudo();
        mostrarNotificacao(editId ? 'Produto atualizado!' : 'Produto cadastrado!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar o produto.', 'erro');
    }
}

function excluirProduto(id) {
    const p = produtos.find(x => String(x.id) === String(id));
    abrirConfirmacao(`Excluir o produto "${p?.nome}"?`, async () => {
        try {
            await excluirProdutoNoBanco(id);
            await renderizarProdutos();
            if (typeof atualizarTudo === 'function') atualizarTudo();
            mostrarNotificacao('Produto excluído.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir o produto.', 'erro');
        }
    }, 'Excluir produto');
}

document.addEventListener('DOMContentLoaded', () => {
    produtos = carregarProdutos();
});
