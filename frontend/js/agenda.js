// ======================================
// AGENDA
// ======================================

let eventos = [];
let calMes = new Date().getMonth();
let calAno = new Date().getFullYear();

function _dataLocalISO(data) {
    // O backend devolve `data` como DateTime ISO completo (ex.: 2026-06-23T00:00:00.000Z).
    // Para comparar com o grid do calendário (que trabalha em "yyyy-mm-dd" local),
    // usamos só a parte da data, sem conversão de fuso.
    return String(data).split('T')[0];
}

async function renderizarCalendario() {
    const inicio = new Date(calAno, calMes, 1).toISOString();
    const fim = new Date(calAno, calMes + 1, 0, 23, 59, 59).toISOString();
    eventos = await carregarEventosDoBanco({ inicio, fim });
    _desenharCalendario();
}

function _desenharCalendario() {
    const grid  = document.getElementById('calendarGrid');
    const label = document.getElementById('mesAno');
    if (!grid) return;

    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    label.textContent = `${meses[calMes]} ${calAno}`;

    grid.innerHTML = dias.map(d => html`<div class="cal-day-header">${d}</div>`).join('');

    const primeiroDia = new Date(calAno, calMes, 1).getDay();
    const totalDias   = new Date(calAno, calMes + 1, 0).getDate();
    const hoje        = new Date();

    for (let i = 0; i < primeiroDia; i++) {
        const prev = new Date(calAno, calMes, 0).getDate();
        grid.innerHTML += html`<div class="cal-day other-month"><div class="cal-date">${prev - primeiroDia + i + 1}</div></div>`;
    }

    for (let d = 1; d <= totalDias; d++) {
        const isHoje  = hoje.getDate() === d && hoje.getMonth() === calMes && hoje.getFullYear() === calAno;
        const dataStr = `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const evsDia  = eventos.filter(e => _dataLocalISO(e.data) === dataStr);
        // Sem .join(''): o array de trechos `html` é concatenado pela própria
        // função de escape, preservando o HTML. Um .join('') aqui devolveria
        // uma string comum, que seria escapada ao ser interpolada abaixo e
        // apareceria como texto literal na tela.
        const dotHtml = evsDia.length > 0 ? html`<div class="cal-dots">${evsDia.slice(0,3).map(() => html`<span class="cal-dot"></span>`)}</div>` : '';
        const evHtml  = evsDia.slice(0,2).map(e => html`<div class="cal-event" title="${e.titulo}">${e.titulo}</div>`);
        grid.innerHTML += html`<div class="cal-day${isHoje ? ' today' : ''}" onclick="abrirModalEvento('${dataStr}')" title="Adicionar evento">${dotHtml}<div class="cal-date">${d}</div>${evHtml}</div>`;
    }

    renderizarTabelaEventos();
}

function renderizarTabelaEventos() {
    const tabela = document.getElementById('tabelaEventos');
    if (!tabela) return;
    const hoje = new Date().toISOString().split('T')[0];
    const proximos = eventos
        .filter(e => _dataLocalISO(e.data) >= hoje)
        .sort((a,b) => _dataLocalISO(a.data).localeCompare(_dataLocalISO(b.data)));

    if (proximos.length === 0) {
        tabela.innerHTML = emptyState('Nenhum evento próximo.', 'fa-calendar-days', 'Clique em um dia no calendário para adicionar.');
        return;
    }

    const cores = { reuniao: 'var(--accent)', tarefa: 'var(--warning)', compromisso: 'var(--success)', outro: 'var(--text-muted)' };
    tabela.innerHTML = proximos.map(e => {
        const d = new Date(_dataLocalISO(e.data) + 'T12:00:00').toLocaleDateString('pt-BR');
        return html`
        <tr>
            <td>${d}</td>
            <td>${e.hora || '—'}</td>
            <td><strong>${e.titulo}</strong>${e.descricao ? html`<br><span class="t-11 t-mudo">${e.descricao}</span>` : ''}</td>
            <td><span style="color:${cores[e.tipo]||'var(--accent)'}"><i class="fa-solid fa-circle" style="font-size:8px;margin-right:4px"></i>${e.tipo}</span></td>
            <td><button class="btn-icon btn-icon-danger" onclick="excluirEvento(${e.id})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    }).join('');
}

async function salvarEvento() {
    if (!validarCampos([{ id: 'eventoTitulo' }, { id: 'eventoData' }])) return;

    const dataISO = document.getElementById('eventoData').value;
    const dados = {
        titulo:    document.getElementById('eventoTitulo').value.trim(),
        data:      new Date(dataISO + 'T12:00:00').toISOString(),
        hora:      document.getElementById('eventoHora').value,
        descricao: document.getElementById('eventoDescricao').value.trim(),
        tipo:      document.getElementById('eventoTipo').value
    };

    try {
        await salvarEventoNoBanco(dados);
        fecharModalEvento();
        await renderizarCalendario();
        mostrarNotificacao('Evento adicionado!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar o evento.', 'erro');
    }
}

function excluirEvento(id) {
    abrirConfirmacao('Excluir este evento?', async () => {
        try {
            await excluirEventoNoBanco(id);
            await renderizarCalendario();
            mostrarNotificacao('Evento excluído.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir o evento.', 'erro');
        }
    });
}

function mesAnterior() { calMes--; if (calMes < 0)  { calMes = 11; calAno--; } renderizarCalendario(); }
function mesProximo()  { calMes++; if (calMes > 11) { calMes = 0;  calAno++; } renderizarCalendario(); }

document.addEventListener('DOMContentLoaded', () => { eventos = carregarEventos(); });
