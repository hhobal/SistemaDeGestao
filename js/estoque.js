// ======================================
// ESTOQUE
// ======================================

let movimentos = [];

async function atualizarEstoque() {
    const [resumo, listaMovimentos] = await Promise.all([
        carregarResumoEstoqueDoBanco(),
        carregarMovimentosDoBanco()
    ]);
    movimentos = listaMovimentos;
    renderizarCardsEstoque();
    renderizarMovimentos();
    _atualizarResumoEstoqueCards(resumo);
}

function _atualizarResumoEstoqueCards(resumo) {
    // Os cards de resumo de estoque (se existirem na tela) usam os
    // mesmos números que o backend já calcula em /api/estoque/resumo,
    // evitando que o front recalcule (e divirja) essa lógica.
    const el = id => document.getElementById(id);
    if (el('estoqueTotalProdutos')) el('estoqueTotalProdutos').textContent = resumo.totalProdutos;
    if (el('estoqueValorTotal')) el('estoqueValorTotal').textContent = Number(resumo.valorTotalEstoque||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    if (el('estoqueCriticos')) el('estoqueCriticos').textContent = resumo.criticos;
    if (el('estoqueZerados')) el('estoqueZerados').textContent = resumo.zerados;
}

function renderizarCardsEstoque() {
    const container = document.getElementById('estoqueCards');
    if (!container) return;

    const prods = carregarProdutos();
    if (prods.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1;text-align:center;padding:24px"><i class="fa-solid fa-warehouse" style="font-size:32px;display:block;margin-bottom:8px;opacity:.3"></i>Nenhum produto cadastrado.</div>`;
        return;
    }

    container.innerHTML = prods.map(p => {
        const estq = Number(p.estoque || 0);
        const min  = Number(p.estoqueMin || 0);
        let cor = 'var(--success)';
        let icone = 'fa-check-circle';
        let status = 'Normal';
        if (min > 0 && estq <= min) { cor = 'var(--danger)'; icone = 'fa-triangle-exclamation'; status = 'Crítico'; }
        else if (estq <= min * 1.5 + 3) { cor = 'var(--warning)'; icone = 'fa-circle-exclamation'; status = 'Baixo'; }

        return `
        <div class="card estoque-card" style="border-left:3px solid ${cor}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <span style="font-size:11px;color:var(--text-muted);font-weight:500">${p.categoria||'—'}</span>
                <i class="fa-solid ${icone}" style="color:${cor};font-size:14px"></i>
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px">${p.nome}</div>
            <div style="font-size:28px;font-weight:700;color:${cor};line-height:1">${estq}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${min > 0 ? `mín: ${min} · ` : ''}${status}</div>
        </div>`;
    }).join('');
}

function renderizarMovimentos() {
    const tabela = document.getElementById('tabelaMovimentos');
    if (!tabela) return;

    const filtroTipo = document.getElementById('filtroMovTipo')?.value || '';
    const lista = filtroTipo
        ? movimentos.filter(m => m.tipo === filtroTipo)
        : movimentos;

    if (lista.length === 0) {
        tabela.innerHTML = emptyState('Nenhuma movimentação registrada.', 'fa-arrows-rotate', 'Clique em "+ Registrar Movimento" para começar.');
        return;
    }

    tabela.innerHTML = lista.slice(0, 50).map(m => {
        const cor = m.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)';
        const icone = m.tipo === 'entrada' ? 'fa-arrow-down' : 'fa-arrow-up';
        const dataFmt = m.data ? new Date(m.data).toLocaleDateString('pt-BR') : '—';
        return `
        <tr>
            <td>${dataFmt}</td>
            <td>${m.produto?.nome || '—'}</td>
            <td><span style="color:${cor}"><i class="fa-solid ${icone}" style="font-size:10px"></i> ${m.tipo}</span></td>
            <td style="color:${cor};font-weight:700">${m.tipo === 'entrada' ? '+' : '-'}${m.quantidade}</td>
            <td style="color:var(--text-muted);font-size:12px">${m.motivo || '—'}</td>
            <td>${m.responsavel || '—'}</td>
        </tr>`;
    }).join('');
}

async function salvarMovimento() {
    if (!validarCampos([{ id: 'movQtd' }])) return;

    const produtoId = parseInt(document.getElementById('movProduto').value);
    const tipo      = document.getElementById('movTipo').value;
    const quantidade = parseInt(document.getElementById('movQtd').value);
    const motivo     = document.getElementById('movMotivo').value.trim();

    if (!produtoId || !quantidade || quantidade <= 0) { mostrarNotificacao('Preencha todos os campos.', 'erro'); return; }

    try {
        await criarMovimentoNoBanco({ produtoId, tipo, quantidade, motivo });
        fecharModalMovimento();
        await atualizarEstoque();
        if (typeof atualizarTudo === 'function') atualizarTudo();
        mostrarNotificacao(`Estoque ${tipo === 'entrada' ? 'adicionado' : 'baixado'}!`);
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível registrar a movimentação.', 'erro');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    movimentos = carregarMovimentos();
});
