// ======================================
// PEDIDOS — PAINEL ADMINISTRATIVO
// ======================================
// Os pedidos são criados pelos clientes na loja virtual (ver loja.html,
// que chama POST /api/loja/pedidos). Aqui o painel só lista, acompanha
// e altera o status — toda a lógica de estoque/financeiro associada a
// uma mudança de status já é feita pelo backend (pedidos.service.js),
// então este arquivo não duplica mais essas regras.

let pedidos = [];
const PEDIDOS_POR_PAGINA = 12;
let paginaAtualPedidos = 1;

function mudarPaginaPedidos(p) {
    const total = Math.ceil(pedidos.length / PEDIDOS_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaAtualPedidos = p;
    _desenharTabelaPedidos();
}

function _filtrosPedidosAtuais() {
    return {
        busca:  document.getElementById('pesquisaPedidos')?.value || '',
        status: document.getElementById('filtroStatusPedido')?.value || ''
    };
}

async function renderizarPedidos() {
    const [resumo, lista] = await Promise.all([
        carregarResumoPedidosDoBanco(),
        carregarPedidosDoBanco(_filtrosPedidosAtuais())
    ]);
    pedidos = lista;
    paginaAtualPedidos = 1;
    _desenharTabelaPedidos();

    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const el = id => document.getElementById(id);
    if (el('pedPendentes'))   el('pedPendentes').textContent   = resumo.pendentes;
    if (el('pedProcessando')) el('pedProcessando').textContent = resumo.processando;
    if (el('pedEnviados'))    el('pedEnviados').textContent    = resumo.enviados;
    if (el('pedFaturado'))    el('pedFaturado').textContent    = fmt(resumo.faturado);
}

function _desenharTabelaPedidos() {
    const tabela = document.getElementById('tabelaPedidos');
    if (!tabela) return;

    const inicio = (paginaAtualPedidos - 1) * PEDIDOS_POR_PAGINA;
    const pagina = pedidos.slice(inicio, inicio + PEDIDOS_POR_PAGINA);
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

    const statusNome = { pendente:'Pendente', processando:'Em preparo', enviado:'Enviado', entregue:'Entregue', cancelado:'Cancelado' };
    const pagNome    = { cartao:'Cartão', pix:'PIX', boleto:'Boleto' };

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum pedido encontrado.', 'fa-bag-shopping', 'Os pedidos realizados na loja aparecem aqui.');
        return;
    }

    tabela.innerHTML = pagina.map(p => {
        const statusFinal = ['entregue', 'cancelado'].includes(p.status);
        const statusCampo = statusFinal
            ? html`<span class="status-badge ${p.status === 'entregue' ? 'status-entregue' : 'status-cancelado'}">${statusNome[p.status]}</span>`
            : html`<select class="status-select" onchange="alterarStatusPedido(${p.id}, this.value)" style="background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);padding:4px 8px;border-radius:6px;font-size:12px;cursor:pointer">
                 <option value="pendente"    ${p.status==='pendente'   ?'selected':''}>Pendente</option>
                 <option value="processando" ${p.status==='processando'?'selected':''}>Em preparo</option>
                 <option value="enviado"     ${p.status==='enviado'    ?'selected':''}>Enviado</option>
                 <option value="entregue"    ${p.status==='entregue'   ?'selected':''}>Entregue</option>
                 <option value="cancelado"   ${p.status==='cancelado'  ?'selected':''}>Cancelado</option>
               </select>`;

        return html`
        <tr>
            <td><span style="font-family:monospace;font-weight:700;color:var(--accent)">#${p.numero}</span></td>
            <td>
                <strong>${p.cliente?.nome || '—'}</strong>
                <br><span class="t-11 t-mudo">${p.cliente?.email||''}</span>
            </td>
            <td>
                <div style="font-size:12px;max-width:200px">
                    ${(p.itens||[]).map(i => `${i.nome} ×${i.quantidade}`).join('<br>')}
                </div>
            </td>
            <td class="t-forte t-sucesso">${fmt(p.total)}</td>
            <td><span class="tag">${pagNome[p.pagamento]||p.pagamento||'—'}</span></td>
            <td>${statusCampo}</td>
            <td class="t-11 t-mudo">${p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '—'}</td>
            <td>
                <button class="btn-icon" onclick="verDetalhesPedido(${p.id})" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-icon btn-icon-danger" onclick="excluirPedido(${p.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');

    renderizarPaginacao('paginacaoPedidos', pedidos.length, PEDIDOS_POR_PAGINA, paginaAtualPedidos, 'mudarPaginaPedidos');
}

// ─── ALTERAR STATUS ────────────────────
// O backend (pedidos.service.js) já cuida de: marcar receita como paga
// quando "entregue", devolver estoque e estornar lançamentos quando
// "cancelado". O front só chama a rota e re-renderiza.

async function alterarStatusPedido(id, novoStatus) {
    try {
        await alterarStatusPedidoNoBanco(id, novoStatus);
        await renderizarPedidos();
        if (typeof atualizarTudo === 'function') atualizarTudo();
        mostrarNotificacao(`Pedido atualizado para "${novoStatus}".`);
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível atualizar o status do pedido.', 'erro');
        await renderizarPedidos();
    }
}

// ─── DETALHES DO PEDIDO ────────────────

async function verDetalhesPedido(id) {
    let p;
    try {
        p = await obterPedidoDoBanco(id);
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível carregar os detalhes do pedido.', 'erro');
        return;
    }

    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    // A API manda Decimal como string; Number() antes de qualquer conta.
    const custoTotal = Number(p.custoTotal ?? 0);
    const lucro = Number(p.lucroBruto ?? (Number(p.total || 0) - custoTotal));

    const pagNome = { cartao:'Cartão de crédito', pix:'PIX', boleto:'Boleto bancário' };

    document.getElementById('detalhesPedidoConteudo').innerHTML = html`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
            <div>
                <div class="t-11 t-mudo mb-4">Pedido</div>
                <div style="font-size:20px;font-weight:700;color:var(--accent)">#${p.numero}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${p.data ? new Date(p.data).toLocaleDateString('pt-BR') : ''}</div>
            </div>
            <div>
                <div class="t-11 t-mudo mb-4">Pagamento</div>
                <div style="font-size:14px;font-weight:600">${pagNome[p.pagamento]||p.pagamento}</div>
                ${p.pagamento==='cartao' && p.parcelas>1 ? html`<div class="t-12 t-mudo">${p.parcelas}× sem juros</div>` : ''}
            </div>
        </div>

        <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:14px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;font-weight:600">CLIENTE</div>
            <div style="font-weight:600">${p.cliente?.nome || '—'}</div>
            <div class="t-12 t-mudo">${p.cliente?.email||''}</div>
            <div class="t-12 t-mudo">${p.cliente?.telefone||''}</div>
            ${p.enderecoEntrega ? html`<div style="font-size:12px;color:var(--text-muted);margin-top:4px"><i class="fa-solid fa-location-dot t-10"></i> ${p.enderecoEntrega}</div>` : ''}
        </div>

        <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:14px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;font-weight:600">ITENS DO PEDIDO</div>
            ${(p.itens||[]).map(item => {
                const custoItem = Number(item.produto?.custo||0) * item.quantidade;
                return html`
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
                    <div>
                        <div style="font-size:13px;font-weight:500">${item.nome}</div>
                        <div class="t-11 t-mudo">Qtd: ${item.quantidade} × ${fmt(item.precoUnitario)}</div>
                    </div>
                    <div style="text-align:right">
                        <div class="t-forte t-sucesso">${fmt(item.subtotal)}</div>
                        ${custoItem > 0 ? html`<div class="t-10 t-mudo">custo: ${fmt(custoItem)}</div>` : ''}
                    </div>
                </div>`;
            })}
        </div>

        <div style="background:var(--bg-secondary);border-radius:8px;padding:14px">
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
                <span class="t-mudo">Subtotal</span>
                <span>${fmt(p.total)}</span>
            </div>
            ${custoTotal > 0 ? html`
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
                <span class="t-mudo">Custo total (CMV)</span>
                <span class="t-perigo">−${fmt(custoTotal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0 4px;font-size:14px;font-weight:700;border-top:1px solid var(--border);margin-top:4px">
                <span>Lucro bruto</span>
                <span style="color:${lucro>=0?'var(--success)':'var(--danger)'}">${fmt(lucro)}</span>
            </div>` : ''}
        </div>
    `;

    abrirModal('modalDetalhesPedido');
}

function excluirPedido(id) {
    const p = pedidos.find(x => String(x.id) === String(id));
    abrirConfirmacao(`Excluir o pedido "#${p?.numero}"? Esta ação não pode ser desfeita.`, async () => {
        try {
            await excluirPedidoNoBanco(id);
            await renderizarPedidos();
            if (typeof atualizarTudo === 'function') atualizarTudo();
            mostrarNotificacao('Pedido excluído.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir o pedido. Só pedidos já cancelados podem ser excluídos.', 'erro');
        }
    }, 'Excluir pedido');
}

document.addEventListener('DOMContentLoaded', () => {
    pedidos = carregarPedidos();
});
