// ======================================
// DASHBOARD
// ======================================
// Antes, cada card/gráfico era recalculado no navegador a partir do
// localStorage, e o faturamento só considerava O.S. (vendas da loja
// nunca entravam na conta). Agora tudo vem pronto de /api/dashboard,
// que já soma Pedidos + O.S. corretamente (ver relatorios.service.js).

let graficoPedidosChart = null;
let graficoFaturamentoChart = null;

async function atualizarDashboard() {
    let dados;
    try {
        dados = await carregarDashboardDoBanco();
    } catch (erro) {
        console.warn('Não foi possível carregar o dashboard:', erro.message);
        return;
    }

    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const el = id => document.getElementById(id);

    if (el('totalClientes'))    el('totalClientes').textContent    = dados.cards.clientesAtivos;
    if (el('totalOS'))          el('totalOS').textContent          = dados.cards.osAbertas;
    if (el('faturamentoTotal')) el('faturamentoTotal').textContent = fmt(dados.cards.faturamentoTotal);

    // "Total de produtos" não vem no payload do dashboard (não é uma
    // métrica de negócio ali) — usamos a contagem do cache de produtos,
    // carregando-os se ainda não tiverem sido buscados nesta sessão.
    if (el('totalProdutos')) {
        const prods = produtosCache?.length ? produtosCache : await carregarProdutosDoBanco();
        el('totalProdutos').textContent = prods.length;
    }

    _renderizarAlertasDashboard(dados.alertas);
    _graficoFaturamentoMensal(dados.faturamentoMensal);
    _graficoTopClientes(dados.topClientes);
}

function _renderizarAlertasDashboard(alertas) {
    const container = document.getElementById('dashAlertas');
    if (!container) return;

    const itens = [];
    if (alertas.estoqueCritico?.length) {
        itens.push({ cor: 'var(--danger)', icone: 'fa-warehouse', texto: `${alertas.estoqueCritico.length} produto(s) com estoque crítico`, secao: 'estoque' });
    }
    if (alertas.contasVencidas?.length) {
        itens.push({ cor: 'var(--warning)', icone: 'fa-wallet', texto: `${alertas.contasVencidas.length} lançamento(s) vencido(s)`, secao: 'financas' });
    }
    if (alertas.osUrgentes?.length) {
        itens.push({ cor: 'var(--danger)', icone: 'fa-screwdriver-wrench', texto: `${alertas.osUrgentes.length} O.S. urgente(s)`, secao: 'os' });
    }

    if (itens.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = itens.map(a => html`
        <div class="dash-alerta" onclick="mostrarSecao('${a.secao}')" style="border-left-color:${a.cor}">
            <i class="fa-solid ${a.icone}" style="color:${a.cor}"></i>
            <span>${a.texto}</span>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted);font-size:10px;margin-left:auto"></i>
        </div>
    `).join('');
}

// Gráfico de linha: faturamento mensal (receitas pagas, somando
// Pedidos + O.S.), vindos prontos de /api/dashboard.
function _graficoFaturamentoMensal(serieMensal) {
    const canvas = document.getElementById('graficoPedidos');
    if (!canvas) return;

    const labels = (serieMensal || []).map(m => {
        const [ano, mes] = m.mes.split('-');
        const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
    });
    const valores = (serieMensal || []).map(m => m.total);

    if (graficoPedidosChart) graficoPedidosChart.destroy();
    graficoPedidosChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Faturamento (R$)',
                data: valores,
                borderColor: '#4f8ef7',
                backgroundColor: 'rgba(79,142,247,0.12)',
                tension: 0.4,
                fill: true,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b93a7' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b93a7' }, beginAtZero: true }
            }
        }
    });
}

// Gráfico de barras: top clientes por valor comprado (Pedidos entregues
// + O.S. concluídas), também vindo pronto da API.
function _graficoTopClientes(topClientes) {
    const canvas = document.getElementById('graficoFaturamento');
    if (!canvas) return;

    const labels = (topClientes || []).map(c => c.nome);
    const valores = (topClientes || []).map(c => c.total);

    if (graficoFaturamentoChart) graficoFaturamentoChart.destroy();
    graficoFaturamentoChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Total comprado (R$)',
                data: valores,
                backgroundColor: 'rgba(52,211,153,0.7)',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b93a7' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b93a7' }, beginAtZero: true }
            }
        }
    });
}
