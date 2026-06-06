// ======================================
// FORNECEDORES
// ======================================

let fornecedores = [];
const FORN_POR_PAGINA = 10;
let paginaFornecedores = 1;
let fornecedorEditando = null;

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

function renderizarFornecedores() {
    fornecedores = carregarFornecedores();
    const tabela = document.getElementById('tabelaFornecedores');
    if (!tabela) return;

    const filtrados = _filtrarFornecedores();
    const inicio = (paginaFornecedores - 1) * FORN_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + FORN_POR_PAGINA);

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum fornecedor encontrado.', 'fa-truck');
    } else {
        tabela.innerHTML = pagina.map(f => `
            <tr>
                <td>${f.id}</td>
                <td><strong>${f.empresa}</strong>${f.cnpj ? `<br><span style="font-size:11px;color:var(--text-muted)">${f.cnpj}</span>` : ''}</td>
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

function salvarFornecedor() {
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

    fornecedores = carregarFornecedores();

    if (editId !== null && editId !== undefined) {
        const f = fornecedores.find(x => x.id === editId);
        if (f) Object.assign(f, dados);
        registrarLog('Editar', 'Fornecedores', dados.empresa);
    } else {
        fornecedores.push({ id: _nextId(fornecedores), ...dados });
        registrarLog('Criar', 'Fornecedores', dados.empresa);
    }

    salvarFornecedoresList();
    fecharModalFornecedor();
    renderizarFornecedores();
    mostrarNotificacao(editId ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!');
}

function excluirFornecedor(id) {
    const f = fornecedores.find(x => x.id === id);
    abrirConfirmacao(`Excluir o fornecedor "${f?.empresa}"?`, () => {
        fornecedores = fornecedores.filter(x => x.id !== id);
        salvarFornecedoresList();
        renderizarFornecedores();
        registrarLog('Excluir', 'Fornecedores', f?.empresa);
        mostrarNotificacao('Fornecedor excluído.');
    }, 'Excluir fornecedor');
}

document.addEventListener('DOMContentLoaded', () => {
    fornecedores = carregarFornecedores();
});
