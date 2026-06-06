// ======================================
// PEDIDOS — PAINEL ADMINISTRATIVO
// ======================================

let pedidos = [];
const PEDIDOS_POR_PAGINA = 12;
let paginaAtualPedidos = 1;

// ─── STORAGE KEYS LOJA ─────────────────
const LOJA_SESSAO   = 'loja_sessao';
const LOJA_CLIENTES = 'loja_clientes';

function carregarClientesLoja()  { try { return JSON.parse(localStorage.getItem(LOJA_CLIENTES) || '[]'); } catch { return []; } }
function carregarSessaoLoja()    { try { return JSON.parse(localStorage.getItem(LOJA_SESSAO) || 'null'); } catch { return null; } }

// ─── INICIALIZAÇÃO ─────────────────────

function mudarPaginaPedidos(p) {
    const total = Math.ceil(_filtrarPedidos().length / PEDIDOS_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaAtualPedidos = p;
    renderizarPedidos();
}

function _filtrarPedidos() {
    const filtro  = (document.getElementById('pesquisaPedidos')?.value || '').toLowerCase();
    const sfiltro = document.getElementById('filtroStatusPedido')?.value || '';
    return pedidos.filter(p =>
        ((p.nro||'').toLowerCase().includes(filtro) ||
         (p.clienteNome||'').toLowerCase().includes(filtro)) &&
        (sfiltro ? p.status === sfiltro : true)
    );
}

function renderizarPedidos() {
    pedidos = carregarPedidos();
    const tabela = document.getElementById('tabelaPedidos');
    if (!tabela) return;

    const filtrados = _filtrarPedidos();
    const inicio = (paginaAtualPedidos - 1) * PEDIDOS_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + PEDIDOS_POR_PAGINA);
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

    const statusCls  = { pendente:'status-pendente', processando:'status-processando', enviado:'status-entregue', entregue:'status-entregue', cancelado:'status-cancelado' };
    const statusNome = { pendente:'Pendente', processando:'Em preparo', enviado:'Enviado', entregue:'Entregue', cancelado:'Cancelado' };
    const pagNome    = { cartao:'Cartão', pix:'PIX', boleto:'Boleto' };

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhum pedido encontrado.', 'fa-bag-shopping', 'Os pedidos realizados na loja aparecem aqui.');
        return;
    }

    tabela.innerHTML = pagina.map(p => `
        <tr>
            <td><span style="font-family:monospace;font-weight:700;color:var(--accent)">#${p.nro}</span></td>
            <td>
                <strong>${p.clienteNome}</strong>
                <br><span style="font-size:11px;color:var(--text-muted)">${p.clienteEmail||''}</span>
            </td>
            <td>
                <div style="font-size:12px;max-width:200px">
                    ${(p.itens||[]).map(i => `${i.nome} ×${i.qtd}`).join('<br>')}
                </div>
            </td>
            <td style="font-weight:700;color:var(--success)">${fmt(p.total)}</td>
            <td><span class="tag">${pagNome[p.pagamento]||p.pagamento||'—'}</span></td>
            <td>
                <select class="status-select" onchange="alterarStatusPedido(${p.id}, this.value)" style="background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);padding:4px 8px;border-radius:6px;font-size:12px;cursor:pointer">
                    <option value="pendente"     ${p.status==='pendente'     ?'selected':''}>Pendente</option>
                    <option value="processando"  ${p.status==='processando'  ?'selected':''}>Em preparo</option>
                    <option value="enviado"      ${p.status==='enviado'      ?'selected':''}>Enviado</option>
                    <option value="entregue"     ${p.status==='entregue'     ?'selected':''}>Entregue</option>
                    <option value="cancelado"    ${p.status==='cancelado'    ?'selected':''}>Cancelado</option>
                </select>
            </td>
            <td style="font-size:11px;color:var(--text-muted)">${p.data}</td>
            <td>
                <button class="btn-icon" onclick="verDetalhesPedido(${p.id})" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button>
                <button class="btn-icon btn-icon-danger" onclick="excluirPedido(${p.id})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');

    renderizarPaginacao('paginacaoPedidos', filtrados.length, PEDIDOS_POR_PAGINA, paginaAtualPedidos, 'mudarPaginaPedidos');
    _atualizarCardsPedidos();
}

function _atualizarCardsPedidos() {
    const todos      = carregarPedidos();
    const pendentes  = todos.filter(p => p.status === 'pendente').length;
    const processando= todos.filter(p => p.status === 'processando').length;
    const enviados   = todos.filter(p => p.status === 'enviado').length;
    const faturado   = todos.filter(p => p.status !== 'cancelado').reduce((s,p) => s+Number(p.total||0), 0);
    const fmt = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

    const el = id => document.getElementById(id);
    if (el('pedPendentes'))   el('pedPendentes').textContent   = pendentes;
    if (el('pedProcessando')) el('pedProcessando').textContent = processando;
    if (el('pedEnviados'))    el('pedEnviados').textContent    = enviados;
    if (el('pedFaturado'))    el('pedFaturado').textContent    = fmt(faturado);
}

// ─── ALTERAR STATUS ────────────────────

function alterarStatusPedido(id, novoStatus) {
    const lista = carregarPedidos();
    const p = lista.find(x => x.id === id);
    if (!p) return;
    const statusAnterior = p.status;
    p.status = novoStatus;

    // Se entregue, baixa estoque (se ainda não baixou)
    if (novoStatus === 'entregue' && statusAnterior !== 'entregue') {
        _baixarEstoquePedido(p);
        // Lançamento financeiro de receita
        _lancarReceitaPedido(p);
    }

    // Se cancelado após entregue, devolve estoque
    if (novoStatus === 'cancelado' && statusAnterior === 'entregue') {
        _devolverEstoquePedido(p);
        _estornarReceitaPedido(p);
    }

    _set(STORAGE_KEYS.PEDIDOS, lista);
    pedidos = lista;
    registrarLog('Status pedido', 'Pedidos', `#${p.nro} → ${novoStatus}`);
    renderizarPedidos();
    if (typeof atualizarTudo === 'function') atualizarTudo();
    mostrarNotificacao(`Pedido #${p.nro} atualizado para "${novoStatus}".`);
}

// ─── INTEGRAÇÃO ESTOQUE ────────────────

function _baixarEstoquePedido(pedido) {
    const prods = carregarProdutos();
    const movs  = carregarMovimentos();
    let alterou = false;

    (pedido.itens || []).forEach(item => {
        const p = prods.find(x => x.id === item.produtoId);
        if (p) {
            p.estoque = Math.max(0, Number(p.estoque||0) - item.qtd);
            alterou = true;
            movs.push({
                id: Date.now() + Math.random(),
                data: new Date().toLocaleDateString('pt-BR'),
                produto: p.nome,
                tipo: 'saida',
                qtd: item.qtd,
                motivo: `Pedido #${pedido.nro}`,
                responsavel: 'Loja'
            });
        }
    });

    if (alterou) {
        _set(STORAGE_KEYS.PRODUTOS, prods);
        _set(STORAGE_KEYS.MOVIMENTOS, movs);
    }
}

function _devolverEstoquePedido(pedido) {
    const prods = carregarProdutos();
    const movs  = carregarMovimentos();

    (pedido.itens || []).forEach(item => {
        const p = prods.find(x => x.id === item.produtoId);
        if (p) {
            p.estoque = Number(p.estoque||0) + item.qtd;
            movs.push({
                id: Date.now() + Math.random(),
                data: new Date().toLocaleDateString('pt-BR'),
                produto: p.nome,
                tipo: 'entrada',
                qtd: item.qtd,
                motivo: `Devolução — Pedido cancelado #${pedido.nro}`,
                responsavel: 'Sistema'
            });
        }
    });

    _set(STORAGE_KEYS.PRODUTOS, prods);
    _set(STORAGE_KEYS.MOVIMENTOS, movs);
}

// ─── INTEGRAÇÃO FINANCEIRO ─────────────

function _lancarReceitaPedido(pedido) {
    const fmt = v => Number(v||0).toFixed(2);
    const lancs = carregarLancamentos();

    // Receita de venda
    lancs.push({
        id: Date.now(),
        descricao: `Venda — Pedido #${pedido.nro} (${pedido.clienteNome})`,
        categoria: 'Venda de produtos',
        tipo: 'receita',
        valor: pedido.total,
        status: 'pago',
        dataISO: new Date().toISOString().split('T')[0],
        data: new Date().toLocaleDateString('pt-BR'),
        pedidoId: pedido.id
    });

    // Custo da mercadoria (soma dos custos dos itens)
    const prods = carregarProdutos();
    const custoTotal = (pedido.itens||[]).reduce((s, item) => {
        const p = prods.find(x => x.id === item.produtoId);
        return s + (Number(p?.custo||0) * item.qtd);
    }, 0);

    if (custoTotal > 0) {
        lancs.push({
            id: Date.now() + 1,
            descricao: `CMV — Pedido #${pedido.nro}`,
            categoria: 'Custo de mercadoria',
            tipo: 'despesa',
            valor: custoTotal,
            status: 'pago',
            dataISO: new Date().toISOString().split('T')[0],
            data: new Date().toLocaleDateString('pt-BR'),
            pedidoId: pedido.id
        });
    }

    _set(STORAGE_KEYS.LANCAMENTOS, lancs);
}

function _estornarReceitaPedido(pedido) {
    const lancs = carregarLancamentos().filter(l => l.pedidoId !== pedido.id);
    _set(STORAGE_KEYS.LANCAMENTOS, lancs);
}

// ─── DETALHES DO PEDIDO ────────────────

function verDetalhesPedido(id) {
    const p = carregarPedidos().find(x => x.id === id);
    if (!p) return;

    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const prods = carregarProdutos();
    const custoTotal = (p.itens||[]).reduce((s, item) => {
        const prod = prods.find(x => x.id === item.produtoId);
        return s + (Number(prod?.custo||0) * item.qtd);
    }, 0);
    const lucro = Number(p.total||0) - custoTotal;

    const pagNome = { cartao:'Cartão de crédito', pix:'PIX', boleto:'Boleto bancário' };

    document.getElementById('detalhesPedidoConteudo').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
            <div>
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Pedido</div>
                <div style="font-size:20px;font-weight:700;color:var(--accent)">#${p.nro}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${p.data}</div>
            </div>
            <div>
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Pagamento</div>
                <div style="font-size:14px;font-weight:600">${pagNome[p.pagamento]||p.pagamento}</div>
                ${p.pagamento==='cartao' && p.parcelas>1 ? `<div style="font-size:12px;color:var(--text-muted)">${p.parcelas}× sem juros</div>` : ''}
            </div>
        </div>

        <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:14px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;font-weight:600">CLIENTE</div>
            <div style="font-weight:600">${p.clienteNome}</div>
            <div style="font-size:12px;color:var(--text-muted)">${p.clienteEmail||''}</div>
            <div style="font-size:12px;color:var(--text-muted)">${p.clienteTelefone||''}</div>
            ${p.enderecoEntrega ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px"><i class="fa-solid fa-location-dot" style="font-size:10px"></i> ${p.enderecoEntrega}</div>` : ''}
        </div>

        <div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:14px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;font-weight:600">ITENS DO PEDIDO</div>
            ${(p.itens||[]).map(item => {
                const prod = prods.find(x => x.id === item.produtoId);
                const custo = Number(prod?.custo||0) * item.qtd;
                return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
                    <div>
                        <div style="font-size:13px;font-weight:500">${item.nome}</div>
                        <div style="font-size:11px;color:var(--text-muted)">Qtd: ${item.qtd} × ${fmt(item.precoUnitario)}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:700;color:var(--success)">${fmt(item.subtotal)}</div>
                        ${custo > 0 ? `<div style="font-size:10px;color:var(--text-muted)">custo: ${fmt(custo)}</div>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>

        <div style="background:var(--bg-secondary);border-radius:8px;padding:14px">
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
                <span style="color:var(--text-muted)">Subtotal</span>
                <span>${fmt(p.total)}</span>
            </div>
            ${custoTotal > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
                <span style="color:var(--text-muted)">Custo total (CMV)</span>
                <span style="color:var(--danger)">−${fmt(custoTotal)}</span>
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
    const p = carregarPedidos().find(x => x.id === id);
    abrirConfirmacao(`Excluir o pedido "#${p?.nro}"? Esta ação não pode ser desfeita.`, () => {
        const lista = carregarPedidos().filter(x => x.id !== id);
        _set(STORAGE_KEYS.PEDIDOS, lista);
        pedidos = lista;
        registrarLog('Excluir', 'Pedidos', `#${p?.nro}`);
        renderizarPedidos();
        if (typeof atualizarTudo === 'function') atualizarTudo();
        mostrarNotificacao('Pedido excluído.');
    }, 'Excluir pedido');
}

// ─── SINCRONIZAR CLIENTES DA LOJA ──────

function sincronizarClientesLoja() {
    const clientesErp  = carregarClientes();
    const clientesLoja = carregarClientesLoja();
    let novos = 0;

    clientesLoja.forEach(cl => {
        const jaExiste = clientesErp.find(c =>
            c.email === cl.email || c.cpf === cl.cpf
        );
        if (!jaExiste) {
            clientesErp.push({
                id: _nextId(clientesErp),
                nome: cl.nome,
                email: cl.email,
                telefone: cl.telefone || '',
                cpf: cl.cpf || '',
                endereco: cl.endereco || '',
                status: 'ativo',
                origem: 'loja'
            });
            novos++;
        }
    });

    if (novos > 0) {
        _set(STORAGE_KEYS.CLIENTES, clientesErp);
        mostrarNotificacao(`${novos} cliente(s) da loja sincronizado(s)!`);
        if (typeof renderizarClientes === 'function') renderizarClientes();
    } else {
        mostrarNotificacao('Todos os clientes já estão sincronizados.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    pedidos = carregarPedidos();
});
