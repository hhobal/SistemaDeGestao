// ======================================
// FINANÇAS
// ======================================

let lancamentos = [];
const LANC_POR_PAGINA = 15;
let paginaAtualLanc = 1;

function _filtrosAtuais() {
    return {
        tipo:   document.getElementById('filtroTipoLanc')?.value || '',
        status: document.getElementById('filtroStatusLanc')?.value || '',
        busca:  document.getElementById('pesquisaLancamentos')?.value || ''
    };
}

async function atualizarFinancas() {
    const filtros = _filtrosAtuais();
    const [resumo, listaLancamentos] = await Promise.all([
        carregarResumoFinancasDoBanco(filtros),
        carregarLancamentosDoBanco(filtros)
    ]);
    lancamentos = listaLancamentos;
    _atualizarCardsFinancas(resumo);
    _desenharTabelaLancamentos();
}

function _atualizarCardsFinancas(resumo) {
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const el = id => document.getElementById(id);
    if (el('finReceitas')) el('finReceitas').textContent = fmt(resumo.receita);
    if (el('finDespesas')) el('finDespesas').textContent = fmt(resumo.despesa);
    if (el('finSaldo')) {
        el('finSaldo').textContent = fmt(resumo.saldo);
        el('finSaldo').style.color = resumo.saldo >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (el('finPendentes')) el('finPendentes').textContent = resumo.pendentes;
}

function mudarPaginaLanc(p) {
    const total = Math.ceil(lancamentos.length / LANC_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaAtualLanc = p;
    _desenharTabelaLancamentos();
}

// A busca/filtro de tipo/status já é feita no backend (atualizarFinancas
// reenvia os filtros atuais a cada chamada). Aqui só paginamos o que
// já veio filtrado.
function renderizarLancamentos() {
    paginaAtualLanc = 1;
    atualizarFinancas();
}

function _desenharTabelaLancamentos() {
    const tabela = document.getElementById('tabelaLancamentos');
    if (!tabela) return;

    const inicio = (paginaAtualLanc - 1) * LANC_POR_PAGINA;
    const pagina = lancamentos.slice(inicio, inicio + LANC_POR_PAGINA);
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum lançamento encontrado.', 'fa-wallet', 'Clique em "+ Novo Lançamento" para registrar.');
    } else {
        tabela.innerHTML = pagina.map(l => {
            const cor = l.tipo === 'receita' ? 'var(--success)' : 'var(--danger)';
            const statusCls = l.status === 'pago' ? 'status-entregue' : 'status-pendente';
            const dataISO = l.data ? String(l.data).split('T')[0] : '';
            const dataFmt = l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '—';

            const hoje = new Date().toISOString().split('T')[0];
            const vencido = l.status === 'pendente' && dataISO && dataISO < hoje;
            const gerencialAutomatico = !!(l.pedidoId || l.osId);

            return html`
            <tr${vencido ? ' style="background:rgba(248,113,113,0.06)"' : ''}>
                <td>${dataFmt}${vencido ? ' <span style="color:var(--danger);font-size:10px;font-weight:700">VENCIDO</span>' : ''}</td>
                <td>${l.descricao}${gerencialAutomatico ? ' <span title="Gerado automaticamente por Pedido/O.S." style="font-size:10px;color:var(--text-muted)"><i class="fa-solid fa-link"></i></span>' : ''}</td>
                <td><span class="tag">${l.categoria||'—'}</span></td>
                <td style="color:${cor};font-weight:600">${l.tipo}</td>
                <td style="color:${cor};font-weight:700">${l.tipo === 'receita' ? '+' : '-'}${fmt(l.valor)}</td>
                <td><span class="status-badge ${statusCls}">${l.status === 'pago' ? 'Pago/Recebido' : 'Pendente'}</span></td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="abrirModalLancamento(${l.id})" ${gerencialAutomatico ? 'disabled style="opacity:.35;cursor:not-allowed"' : ''}><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirLancamento(${l.id})" ${gerencialAutomatico ? 'disabled style="opacity:.35;cursor:not-allowed"' : ''}><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    renderizarPaginacao('paginacaoLanc', lancamentos.length, LANC_POR_PAGINA, paginaAtualLanc, 'mudarPaginaLanc');
}

async function salvarLancamento() {
    if (!validarCampos([{ id: 'lancDescricao' }, { id: 'lancValor' }, { id: 'lancData' }])) return;

    const modal = document.getElementById('modalLancamento');
    const editId = modal._editId;

    const dataISO = document.getElementById('lancData').value;
    const dados = {
        descricao: document.getElementById('lancDescricao').value.trim(),
        categoria: document.getElementById('lancCategoria').value,
        tipo:      document.getElementById('lancTipo').value,
        valor:     parseFloat(document.getElementById('lancValor').value),
        status:    document.getElementById('lancStatus').value,
        data:      dataISO ? new Date(dataISO + 'T12:00:00').toISOString() : undefined
    };

    try {
        await salvarLancamentoNoBanco(dados, editId);
        fecharModalLancamento();
        await atualizarFinancas();
        if (typeof atualizarTudo === 'function') atualizarTudo();
        mostrarNotificacao(editId ? 'Lançamento atualizado!' : 'Lançamento registrado!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar o lançamento.', 'erro');
    }
}

function excluirLancamento(id) {
    const l = lancamentos.find(x => String(x.id) === String(id));
    if (l && (l.pedidoId || l.osId)) {
        mostrarNotificacao('Este lançamento foi gerado automaticamente por um Pedido ou O.S. Cancele a origem em vez de excluir aqui.', 'erro');
        return;
    }
    abrirConfirmacao(`Excluir o lançamento "${l?.descricao}"?`, async () => {
        try {
            await excluirLancamentoNoBanco(id);
            await atualizarFinancas();
            if (typeof atualizarTudo === 'function') atualizarTudo();
            mostrarNotificacao('Lançamento excluído.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir o lançamento.', 'erro');
        }
    }, 'Excluir lançamento');
}

document.addEventListener('DOMContentLoaded', () => {
    lancamentos = carregarLancamentos();
});
