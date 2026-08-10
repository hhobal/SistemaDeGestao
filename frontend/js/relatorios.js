// ======================================
// RELATÓRIOS
// ======================================

let graficoRelOSChart = null;
let graficoRelFinancasChart = null;

async function renderizarRelatorios() {
    const [statusOS, faturamentoMensal, estoqueCritico, top5] = await Promise.all([
        carregarRelatorio('status-os').catch(() => []),
        carregarRelatorio('faturamento-mensal', { meses: 6 }).catch(() => []),
        carregarRelatorio('estoque-critico').catch(() => []),
        carregarRelatorio('top-clientes', { limite: 5 }).catch(() => [])
    ]);

    _graficoStatusOS(statusOS);
    _graficoFluxoCaixa(faturamentoMensal);
    _listaEstoqueCritico(estoqueCritico);
    _listaTop5Clientes(top5);
}

function _graficoStatusOS(dados) {
    const canvas = document.getElementById('graficoRelOS');
    if (!canvas) return;

    const nomes = { aberta: 'Aberta', andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };
    const cores = { aberta: '#f59e0b', andamento: '#4f8ef7', concluida: '#34d399', cancelada: '#f87171' };

    if (graficoRelOSChart) graficoRelOSChart.destroy();
    graficoRelOSChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: dados.map(d => nomes[d.status] || d.status),
            datasets: [{
                data: dados.map(d => d.total),
                backgroundColor: dados.map(d => cores[d.status] || '#8b93a7'),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#8b93a7' } } }
        }
    });
}

function _graficoFluxoCaixa(serieMensal) {
    const canvas = document.getElementById('graficoRelFinancas');
    if (!canvas) return;

    const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const labels = serieMensal.map(m => {
        const [ano, mes] = m.mes.split('-');
        return `${nomes[Number(mes)-1]}/${ano.slice(2)}`;
    });

    if (graficoRelFinancasChart) graficoRelFinancasChart.destroy();
    graficoRelFinancasChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Receita paga (R$)',
                data: serieMensal.map(m => m.total),
                backgroundColor: 'rgba(79,142,247,0.7)',
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

function _listaEstoqueCritico(produtos) {
    const el = document.getElementById('relEstoqueCritico');
    if (!el) return;
    if (produtos.length === 0) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:12px">Nenhum produto em estado crítico. 🎉</div>`;
        return;
    }
    el.innerHTML = produtos.map(p => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px">
            <span>${p.nome}</span>
            <span style="color:var(--danger);font-weight:700">${p.estoque} / mín. ${p.estoqueMin}</span>
        </div>
    `).join('');
}

function _listaTop5Clientes(clientes) {
    const el = document.getElementById('relTop5Clientes');
    if (!el) return;
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    if (clientes.length === 0) {
        el.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:12px">Sem dados suficientes ainda.</div>`;
        return;
    }
    el.innerHTML = clientes.map((c, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px">
            <span><strong style="color:var(--accent)">#${i+1}</strong> ${c.nome} <span style="color:var(--text-muted);font-size:11px">(${c.compras} compra${c.compras===1?'':'s'})</span></span>
            <span style="color:var(--success);font-weight:700">${fmt(c.total)}</span>
        </div>
    `).join('');
}

// ─── EXPORTAÇÕES CSV ────────────────────

function _downloadCSV(linhas, nomeArquivo) {
    const conteudo = linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
}

async function exportarCSV() {
    const lista = await carregarLancamentosDoBanco();
    const linhas = [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status']];
    lista.forEach(l => linhas.push([
        l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '',
        l.descricao, l.categoria, l.tipo, Number(l.valor).toFixed(2).replace('.', ','), l.status
    ]));
    _downloadCSV(linhas, `financeiro-${new Date().toISOString().split('T')[0]}.csv`);
    mostrarNotificacao('CSV financeiro exportado!');
}

async function exportarCSVOS() {
    const lista = await carregarOSDoBanco();
    const linhas = [['Número', 'Título', 'Cliente', 'Responsável', 'Status', 'Prioridade', 'Valor', 'Abertura']];
    lista.forEach(os => linhas.push([
        os.numero, os.titulo, os.cliente?.nome || '', os.responsavel?.nome || '',
        os.status, os.prioridade, Number(os.valor||0).toFixed(2).replace('.', ','),
        os.dataAbertura ? new Date(os.dataAbertura).toLocaleDateString('pt-BR') : ''
    ]));
    _downloadCSV(linhas, `ordens-servico-${new Date().toISOString().split('T')[0]}.csv`);
    mostrarNotificacao('CSV de O.S. exportado!');
}

async function exportarDados() {
    try {
        await exportarDadosDoBanco();
        mostrarNotificacao('Backup exportado!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível exportar o backup.', 'erro');
    }
}
