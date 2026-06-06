// ======================================
// RELATÓRIOS
// ======================================

let graficoRelOS = null;
let graficoRelFinancas = null;
let graficoRelEstoque = null;

function atualizarRelatorios() {
    _relOSSituacao();
    _relFluxoCaixa();
    _relEstoqueCritico();
    _relTop5OS();
}

function _relOSSituacao() {
    const canvas = document.getElementById('graficoRelOS');
    if (!canvas) return;
    const oss = carregarOS();
    const cont = {
        aberta: oss.filter(o => o.status === 'aberta').length,
        andamento: oss.filter(o => o.status === 'andamento').length,
        concluida: oss.filter(o => o.status === 'concluida').length,
        cancelada: oss.filter(o => o.status === 'cancelada').length
    };
    if (graficoRelOS) graficoRelOS.destroy();
    graficoRelOS = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Aberta', 'Em andamento', 'Concluída', 'Cancelada'],
            datasets: [{ data: Object.values(cont), backgroundColor: ['#4f8ef7','#fbbf24','#34d399','#f87171'], borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8b93a7', padding: 12, font: { size: 12 } } } }
        }
    });
}

function _relFluxoCaixa() {
    const canvas = document.getElementById('graficoRelFinancas');
    if (!canvas) return;
    const lancs = carregarLancamentos();
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const receitas = Array(12).fill(0);
    const despesas = Array(12).fill(0);
    lancs.forEach(l => {
        if (!l.dataISO) return;
        const mes = new Date(l.dataISO + 'T12:00:00').getMonth();
        if (l.tipo === 'receita') receitas[mes] += Number(l.valor||0);
        else despesas[mes] += Number(l.valor||0);
    });
    if (graficoRelFinancas) graficoRelFinancas.destroy();
    graficoRelFinancas = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                { label: 'Receitas', data: receitas, backgroundColor: 'rgba(52,211,153,0.75)', borderRadius: 4 },
                { label: 'Despesas', data: despesas, backgroundColor: 'rgba(248,113,113,0.75)', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8b93a7' } } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b93a7' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b93a7' }, beginAtZero: true }
            }
        }
    });
}

function _relEstoqueCritico() {
    const container = document.getElementById('relEstoqueCritico');
    if (!container) return;
    const prods = carregarProdutos().filter(p => Number(p.estoqueMin||0) > 0);
    const criticos = prods.filter(p => Number(p.estoque||0) <= Number(p.estoqueMin||0));
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (criticos.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--success)"><i class="fa-solid fa-check-circle" style="font-size:28px;display:block;margin-bottom:8px"></i>Nenhum produto em situação crítica</div>`;
        return;
    }

    container.innerHTML = `
    <table class="tabela">
        <thead><tr><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Mínimo</th><th>Preço</th></tr></thead>
        <tbody>
        ${criticos.map(p => `
            <tr>
                <td><strong>${p.nome}</strong></td>
                <td>${p.categoria||'—'}</td>
                <td style="color:var(--danger);font-weight:700">${p.estoque}</td>
                <td>${p.estoqueMin}</td>
                <td>${fmt(p.preco)}</td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function _relTop5OS() {
    const container = document.getElementById('relTop5Clientes');
    if (!container) return;
    const oss = carregarOS();
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const porCliente = {};
    oss.forEach(os => {
        if (!os.cliente) return;
        if (!porCliente[os.cliente]) porCliente[os.cliente] = { total: 0, qtd: 0 };
        porCliente[os.cliente].total += Number(os.valor||0);
        porCliente[os.cliente].qtd++;
    });
    const top = Object.entries(porCliente)
        .sort((a,b) => b[1].total - a[1].total)
        .slice(0, 5);

    if (top.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">Nenhuma O.S. registrada ainda.</div>`;
        return;
    }

    container.innerHTML = `
    <table class="tabela">
        <thead><tr><th>#</th><th>Cliente</th><th>O.S.</th><th>Faturado</th></tr></thead>
        <tbody>
        ${top.map(([nome, d], i) => `
            <tr>
                <td style="color:var(--accent);font-weight:700">${i+1}</td>
                <td><strong>${nome}</strong></td>
                <td>${d.qtd}</td>
                <td style="color:var(--success);font-weight:600">${fmt(d.total)}</td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

function exportarCSV() {
    const linhas = [['Tipo','Descrição','Categoria','Valor','Status','Data']];
    carregarLancamentos().forEach(l => {
        linhas.push([
            l.tipo, l.descricao || '', l.categoria || '',
            Number(l.valor||0).toFixed(2).replace('.',','),
            l.status, l.data || ''
        ]);
    });
    const csv = linhas.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao('CSV exportado com sucesso!');
}

function exportarCSVOS() {
    const linhas = [['Nº','Título','Cliente','Responsável','Status','Prioridade','Valor','Data Abertura']];
    carregarOS().forEach(os => {
        linhas.push([
            os.nro || '', os.titulo || '', os.cliente || '', os.responsavel || '',
            os.status || '', os.prioridade || '',
            Number(os.valor||0).toFixed(2).replace('.',','),
            os.dataAbertura || ''
        ]);
    });
    const csv = linhas.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `relatorio-os-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao('CSV de O.S. exportado!');
}
