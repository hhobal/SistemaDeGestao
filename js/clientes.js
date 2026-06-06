// ======================================
// CLIENTES
// ======================================

let clientes = [];
const CLIENTES_POR_PAGINA = 10;
let paginaAtualClientes = 1;
let ordenacaoClientes = { campo: 'nome', asc: true };

function mudarPaginaClientes(p) {
    const total = Math.ceil(_filtrarClientes().length / CLIENTES_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaAtualClientes = p;
    renderizarClientes();
}

function _filtrarClientes() {
    const filtro = (document.getElementById('pesquisaClientes')?.value || '').toLowerCase();
    const statusFiltro = document.getElementById('filtroStatusCliente')?.value || '';
    return clientes.filter(c => {
        const bate = (c.nome||'').toLowerCase().includes(filtro) ||
                     (c.email||'').toLowerCase().includes(filtro) ||
                     (c.telefone||'').toLowerCase().includes(filtro) ||
                     (c.cpf||'').toLowerCase().includes(filtro);
        const status = statusFiltro ? (c.status || 'ativo') === statusFiltro : true;
        return bate && status;
    });
}

function renderizarClientes() {
    clientes = carregarClientes();
    const tabela = document.getElementById('tabelaClientes');
    if (!tabela) return;

    const filtrados = _filtrarClientes();
    const inicio = (paginaAtualClientes - 1) * CLIENTES_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + CLIENTES_POR_PAGINA);

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum cliente encontrado.', 'fa-users', 'Clique em "+ Novo Cliente" para cadastrar.');
    } else {
        const statusCls = { ativo: 'status-entregue', inativo: 'status-pendente', inadimplente: 'status-cancelado' };
        const statusNome = { ativo: 'Ativo', inativo: 'Inativo', inadimplente: 'Inadimplente' };
        tabela.innerHTML = pagina.map(c => `
            <tr>
                <td>${c.id}</td>
                <td><strong>${c.nome}</strong>${c.cpf ? `<br><span style="font-size:11px;color:var(--text-muted)">${c.cpf}</span>` : ''}</td>
                <td>${c.email || '—'}</td>
                <td>${c.telefone || '—'}</td>
                <td><span class="status-badge ${statusCls[c.status||'ativo']}">${statusNome[c.status||'ativo']}</span></td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="abrirModalCliente(${c.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirCliente(${c.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join('');
    }

    renderizarPaginacao('paginacaoClientes', filtrados.length, CLIENTES_POR_PAGINA, paginaAtualClientes, 'mudarPaginaClientes');
    document.getElementById('totalClientes').textContent = clientes.length;
}

function salvarCliente() {
    const campos = [{ id: 'clienteNome', nome: 'Nome' }];
    if (!validarCampos(campos)) return;

    const modal = document.getElementById('modalCliente');
    const editId = modal._editId;

    const dados = {
        nome:       document.getElementById('clienteNome').value.trim(),
        email:      document.getElementById('clienteEmail').value.trim(),
        telefone:   document.getElementById('clienteTelefone').value.trim(),
        cpf:        document.getElementById('clienteCpf').value.trim(),
        endereco:   document.getElementById('clienteEndereco').value.trim(),
        observacao: document.getElementById('clienteObservacao').value.trim(),
        status:     document.getElementById('clienteStatus').value
    };

    clientes = carregarClientes();

    if (editId !== null && editId !== undefined) {
        const c = clientes.find(x => x.id === editId);
        if (c) Object.assign(c, dados);
        registrarLog('Editar', 'Clientes', dados.nome);
    } else {
        clientes.push({ id: _nextId(clientes), ...dados });
        registrarLog('Criar', 'Clientes', dados.nome);
    }

    salvarClientes();
    fecharModalCliente();
    renderizarClientes();
    atualizarTudo();
    mostrarNotificacao(editId ? 'Cliente atualizado!' : 'Cliente cadastrado!');
}

function excluirCliente(id) {
    const c = clientes.find(x => x.id === id);
    abrirConfirmacao(`Excluir o cliente "${c?.nome}"? Esta ação não pode ser desfeita.`, () => {
        clientes = clientes.filter(x => x.id !== id);
        salvarClientes();
        renderizarClientes();
        atualizarTudo();
        registrarLog('Excluir', 'Clientes', c?.nome);
        mostrarNotificacao('Cliente excluído.');
    }, 'Excluir cliente');
}

document.addEventListener('DOMContentLoaded', () => {
    clientes = carregarClientes();
});
