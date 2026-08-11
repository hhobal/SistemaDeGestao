// ======================================
// FORNECEDORES
// ======================================

let fornecedores = [];
const FORN_POR_PAGINA = 10;
let paginaFornecedores = 1;

function mudarPaginaFornecedores(p) {
    const total = Math.ceil(_filtrarFornecedores().length / FORN_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaFornecedores = p;
    renderizarFornecedores();
}

function _filtrarFornecedores() {
    const filtro = (document.getElementById('pesquisaFornecedores')?.value || '').toLowerCase();
    return fornecedores.filter(f =>
        (f.empresa||'').toLowerCase().includes(filtro) ||
        (f.contato||'').toLowerCase().includes(filtro) ||
        (f.cnpj||'').toLowerCase().includes(filtro)
    );
}

async function renderizarFornecedores() {
    fornecedores = await carregarFornecedoresDoBanco();
    _desenharTabelaFornecedores();
}

function _desenharTabelaFornecedores() {
    const tabela = document.getElementById('tabelaFornecedores');
    if (!tabela) return;

    const filtrados = _filtrarFornecedores();
    const inicio = (paginaFornecedores - 1) * FORN_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + FORN_POR_PAGINA);

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum fornecedor encontrado.', 'fa-truck');
    } else {
        tabela.innerHTML = pagina.map(f => html`
            <tr>
                <td>${f.id}</td>
                <td><strong>${f.empresa}</strong>${f.cnpj ? html`<br><span class="t-11 t-mudo">${f.cnpj}</span>` : ''}</td>
                <td>${f.contato || '—'}</td>
                <td>${f.telefone || '—'}</td>
                <td>${f.email || '—'}</td>
                <td><span class="tag">${f.categoria || '—'}</span></td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="abrirModalFornecedor(${f.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirFornecedor(${f.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join('');
    }

    renderizarPaginacao('paginacaoFornecedores', filtrados.length, FORN_POR_PAGINA, paginaFornecedores, 'mudarPaginaFornecedores');
}

async function salvarFornecedor() {
    if (!validarCampos([{ id: 'fornecedorEmpresa' }])) return;

    const modal = document.getElementById('modalFornecedor');
    const editId = modal._editId;

    const dados = {
        empresa:   document.getElementById('fornecedorEmpresa').value.trim(),
        contato:   document.getElementById('fornecedorContato').value.trim(),
        telefone:  document.getElementById('fornecedorTelefone').value.trim(),
        email:     document.getElementById('fornecedorEmail').value.trim(),
        cnpj:      document.getElementById('fornecedorCnpj').value.trim(),
        categoria: document.getElementById('fornecedorCategoria').value
    };

    try {
        await salvarFornecedorNoBanco(dados, editId);
        fecharModalFornecedor();
        await renderizarFornecedores();
        mostrarNotificacao(editId ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar o fornecedor.', 'erro');
    }
}

function excluirFornecedor(id) {
    const f = fornecedores.find(x => String(x.id) === String(id));
    abrirConfirmacao(`Excluir o fornecedor "${f?.empresa}"?`, async () => {
        try {
            await excluirFornecedorNoBanco(id);
            await renderizarFornecedores();
            mostrarNotificacao('Fornecedor excluído.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir o fornecedor.', 'erro');
        }
    }, 'Excluir fornecedor');
}

document.addEventListener('DOMContentLoaded', () => {
    fornecedores = carregarFornecedores();
});
