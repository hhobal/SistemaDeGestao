// ======================================
// DASHBOARD
// ======================================

let graficoPedidosChart = null;
let graficoFaturamentoChart = null;

function atualizarDashboard() {
    const cls  = carregarClientes();
    const prds = carregarProdutos();
    const oss  = carregarOS();
    const lancs= carregarLancamentos();

    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });

    const el = id => document.getElementById(id);
    if (el('totalClientes'))  el('totalClientes').textContent  = cls.length;
    if (el('totalProdutos'))  el('totalProdutos').textContent  = prds.length;
    if (el('totalOS'))        el('totalOS').textContent        = oss.filter(os => os.status === 'aberta' || os.status === 'andamento').length;

    const faturamento = oss.filter(os => os.status === 'concluida').reduce((s, os) => s + Number(os.valor||0), 0);
    if (el('faturamentoTotal')) el('faturamentoTotal').textContent = fmt(faturamento);

    // Alertas do dashboard
    _renderizarAlertasDashboard(prds, lancs, oss);

    // Gráficos
    _graficoOSMensal(oss);
    _graficoFaturamento(oss);
}

function _renderizarAlertasDashboard(prds, lancs, oss) {
    const container = document.getElementById('dashAlertas');
    if (!container) return;

    const alertas = [];
    const hoje = new Date().toISOString().split('T')[0];

    const criticos = prds.filter(p => Number(p.estoqueMin||0) > 0 && Number(p.estoque||0) <= Number(p.estoqueMin||0));
    if (criticos.length) alertas.push({ cor: 'var(--danger)', icone: 'fa-warehouse', texto: `${criticos.length} produto(s) com estoque crítico`, secao: 'estoque' });

    const vencidos = lancs.filter(l => l.status === 'pendente' && l.dataISO && l.dataISO < hoje);
    if (vencidos.length) alertas.push({ cor: 'var(--warning)', icone: 'fa-wallet', texto: `${vencidos.length} lançamento(s) vencido(s)`, secao: 'financas' });

    const osUrgentes = oss.filter(os => os.prioridade === 'urgente' && os.status !== 'concluida' && os.status !== 'cancelada');
    if (osUrgentes.length) alertas.push({ cor: 'var(--danger)', icone: 'fa-screwdriver-wrench', texto: `${osUrgentes.length} O.S. urgente(s)`, secao: 'os' });

    if (alertas.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.innerHTML = alertas.map(a => `
        <div class="dash-alerta" onclick="mostrarSecao('${a.secao}')" style="border-left-color:${a.cor}">
            <i class="fa-solid ${a.icone}" style="color:${a.cor}"></i>
            <span>${a.texto}</span>
            <i class="fa-solid fa-chevron-right" style="color:var(--text-muted);font-size:10px;margin-left:auto"></i>
        </div>
    `).join('');
}

function _graficoOSMensal(oss) {
    const canvas = document.getElementById('graficoPedidos');
    if (!canvas) return;
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const contagem = Array(12).fill(0);
    oss.forEach(os => {
        if (os.dataAbertura) {
            const partes = os.dataAbertura.split('/');
            if (partes.length === 3) {
                const mes = parseInt(partes[1]) - 1;
                if (mes >= 0 && mes < 12) contagem[mes]++;
            }
        }
    });

    if (graficoPedidosChart) graficoPedidosChart.destroy();
    graficoPedidosChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'O.S. abertas',
                data: contagem,
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
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b93a7', stepSize: 1 }, beginAtZero: true }
            }
        }
    });
}

function _graficoFaturamento(oss) {
    const canvas = document.getElementById('graficoFaturamento');
    if (!canvas) return;
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const valores = Array(12).fill(0);
    oss.filter(os => os.status === 'concluida').forEach(os => {
        if (os.dataAbertura) {
            const partes = os.dataAbertura.split('/');
            if (partes.length === 3) {
                const mes = parseInt(partes[1]) - 1;
                if (mes >= 0 && mes < 12) valores[mes] += Number(os.valor || 0);
            }
        }
    });

    if (graficoFaturamentoChart) graficoFaturamentoChart.destroy();
    graficoFaturamentoChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [{
                label: 'Faturamento (R$)',
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
