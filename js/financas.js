// ======================================
// FINANÇAS
// ======================================

let lancamentos = [];

function atualizarFinancas() {
    lancamentos = carregarLancamentos();
    _atualizarCardsFinancas();
    renderizarLancamentos();
}

function _atualizarCardsFinancas() {
    const lancsFiltrados = _filtrarLancamentos();
    const receitas  = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor||0), 0);
    const despesas  = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor||0), 0);
    const pendentes = lancamentos.filter(l => l.status === 'pendente').length;
    const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const el = id => document.getElementById(id);
    if (el('finReceitas')) el('finReceitas').textContent = fmt(receitas);
    if (el('finDespesas')) el('finDespesas').textContent = fmt(despesas);
    if (el('finSaldo')) {
        el('finSaldo').textContent = fmt(receitas - despesas);
        el('finSaldo').style.color = receitas - despesas >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (el('finPendentes')) el('finPendentes').textContent = pendentes;
}

const LANC_POR_PAGINA = 15;
let paginaAtualLanc = 1;

function mudarPaginaLanc(p) {
    const total = Math.ceil(_filtrarLancamentos().length / LANC_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaAtualLanc = p;
    renderizarLancamentos();
}

function _filtrarLancamentos() {
    const tipo    = document.getElementById('filtroTipoLanc')?.value || '';
    const status  = document.getElementById('filtroStatusLanc')?.value || '';
    const termoBusca = (document.getElementById('pesquisaLancamentos')?.value || '').toLowerCase();
    return lancamentos.filter(l =>
        (tipo   ? l.tipo   === tipo   : true) &&
        (status ? l.status === status : true) &&
        (termoBusca ? (l.descricao||'').toLowerCase().includes(termoBusca) || (l.categoria||'').toLowerCase().includes(termoBusca) : true)
    );
}

function renderizarLancamentos() {
    const tabela = document.getElementById('tabelaLancamentos');
    if (!tabela) return;

    const filtrados = _filtrarLancamentos();
    const inicio = (paginaAtualLanc - 1) * LANC_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + LANC_POR_PAGINA);
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum lançamento encontrado.', 'fa-wallet', 'Clique em "+ Novo Lançamento" para registrar.');
    } else {
        tabela.innerHTML = pagina.map(l => {
            const cor = l.tipo === 'receita' ? 'var(--success)' : 'var(--danger)';
            const statusCls = l.status === 'pago' ? 'status-entregue' : 'status-pendente';

            // Alerta de vencido
            const hoje = new Date().toISOString().split('T')[0];
            const vencido = l.status === 'pendente' && l.dataISO && l.dataISO < hoje;

            return `
            <tr${vencido ? ' style="background:rgba(248,113,113,0.06)"' : ''}>
                <td>${l.data}${vencido ? ' <span style="color:var(--danger);font-size:10px;font-weight:700">VENCIDO</span>' : ''}</td>
                <td>${l.descricao}</td>
                <td><span class="tag">${l.categoria||'—'}</span></td>
                <td style="color:${cor};font-weight:600">${l.tipo}</td>
                <td style="color:${cor};font-weight:700">${l.tipo === 'receita' ? '+' : '-'}${fmt(l.valor)}</td>
                <td><span class="status-badge ${statusCls}">${l.status === 'pago' ? 'Pago/Recebido' : 'Pendente'}</span></td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="abrirModalLancamento(${l.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirLancamento(${l.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    renderizarPaginacao('paginacaoLanc', filtrados.length, LANC_POR_PAGINA, paginaAtualLanc, 'mudarPaginaLanc');
}

function salvarLancamento() {
    if (!validarCampos([{ id: 'lancDescricao' }, { id: 'lancValor' }, { id: 'lancData' }])) return;

    const modal = document.getElementById('modalLancamento');
    const editId = modal._editId;

    const dataISO = document.getElementById('lancData').value;
    const dataObj = new Date(dataISO + 'T12:00:00');
    const dados = {
        descricao: document.getElementById('lancDescricao').value.trim(),
        categoria: document.getElementById('lancCategoria').value,
        tipo:      document.getElementById('lancTipo').value,
        valor:     parseFloat(document.getElementById('lancValor').value),
        status:    document.getElementById('lancStatus').value,
        dataISO:   dataISO,
        data:      dataObj.toLocaleDateString('pt-BR')
    };

    lancamentos = carregarLancamentos();

    if (editId !== null && editId !== undefined) {
        const l = lancamentos.find(x => x.id === editId);
        if (l) Object.assign(l, dados);
        registrarLog('Editar', 'Finanças', `${dados.tipo} ${dados.descricao}`);
    } else {
        lancamentos.push({ id: Date.now(), ...dados });
        registrarLog('Criar', 'Finanças', `${dados.tipo} ${dados.descricao}`);
    }

    salvarLancamentosList();
    fecharModalLancamento();
    atualizarFinancas();
    atualizarTudo();
    mostrarNotificacao(editId ? 'Lançamento atualizado!' : 'Lançamento registrado!');
}

function excluirLancamento(id) {
    const l = lancamentos.find(x => x.id === id);
    abrirConfirmacao(`Excluir o lançamento "${l?.descricao}"?`, () => {
        lancamentos = lancamentos.filter(x => x.id !== id);
        salvarLancamentosList();
        atualizarFinancas();
        atualizarTudo();
        registrarLog('Excluir', 'Finanças', l?.descricao);
        mostrarNotificacao('Lançamento excluído.');
    }, 'Excluir lançamento');
}

document.addEventListener('DOMContentLoaded', () => {
    lancamentos = carregarLancamentos();
});
