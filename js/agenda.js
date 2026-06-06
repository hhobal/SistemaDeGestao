// ======================================
// AGENDA
// ======================================

let eventos = [];
let calMes = new Date().getMonth();
let calAno = new Date().getFullYear();

function renderizarCalendario() {
    eventos = carregarEventos();
    const grid  = document.getElementById('calendarGrid');
    const label = document.getElementById('mesAno');
    if (!grid) return;

    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    label.textContent = `${meses[calMes]} ${calAno}`;

    grid.innerHTML = dias.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    const primeiroDia = new Date(calAno, calMes, 1).getDay();
    const totalDias   = new Date(calAno, calMes + 1, 0).getDate();
    const hoje        = new Date();

    for (let i = 0; i < primeiroDia; i++) {
        const prev = new Date(calAno, calMes, 0).getDate();
        grid.innerHTML += `<div class="cal-day other-month"><div class="cal-date">${prev - primeiroDia + i + 1}</div></div>`;
    }

    for (let d = 1; d <= totalDias; d++) {
        const isHoje  = hoje.getDate() === d && hoje.getMonth() === calMes && hoje.getFullYear() === calAno;
        const dataStr = `${calAno}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const evsDia  = eventos.filter(e => e.data === dataStr);
        const dotHtml = evsDia.length > 0 ? `<div class="cal-dots">${evsDia.slice(0,3).map(() => '<span class="cal-dot"></span>').join('')}</div>` : '';
        const evHtml  = evsDia.slice(0,2).map(e => `<div class="cal-event" title="${e.titulo}">${e.titulo}</div>`).join('');
        const dataISO = dataStr;
        grid.innerHTML += `<div class="cal-day${isHoje ? ' today' : ''}" onclick="abrirModalEvento('${dataISO}')" title="Adicionar evento">${dotHtml}<div class="cal-date">${d}</div>${evHtml}</div>`;
    }

    renderizarTabelaEventos();
}

function renderizarTabelaEventos() {
    const tabela = document.getElementById('tabelaEventos');
    if (!tabela) return;
    const hoje = new Date().toISOString().split('T')[0];
    const proximos = eventos.filter(e => e.data >= hoje).sort((a,b) => a.data.localeCompare(b.data));

    if (proximos.length === 0) {
        tabela.innerHTML = emptyState('Nenhum evento próximo.', 'fa-calendar-days', 'Clique em um dia no calendário para adicionar.');
        return;
    }

    const cores = { reuniao: 'var(--accent)', tarefa: 'var(--warning)', compromisso: 'var(--success)', outro: 'var(--text-muted)' };
    tabela.innerHTML = proximos.map(e => {
        const d = new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR');
        return `
        <tr>
            <td>${d}</td>
            <td>${e.hora || '—'}</td>
            <td><strong>${e.titulo}</strong>${e.descricao ? `<br><span style="font-size:11px;color:var(--text-muted)">${e.descricao}</span>` : ''}</td>
            <td><span style="color:${cores[e.tipo]||'var(--accent)'}"><i class="fa-solid fa-circle" style="font-size:8px;margin-right:4px"></i>${e.tipo}</span></td>
            <td><button class="btn-icon btn-icon-danger" onclick="excluirEvento(${e.id})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>`;
    }).join('');
}

function salvarEvento() {
    if (!validarCampos([{ id: 'eventoTitulo' }, { id: 'eventoData' }])) return;

    eventos = carregarEventos();
    eventos.push({
        id:        Date.now(),
        titulo:    document.getElementById('eventoTitulo').value.trim(),
        data:      document.getElementById('eventoData').value,
        hora:      document.getElementById('eventoHora').value,
        descricao: document.getElementById('eventoDescricao').value.trim(),
        tipo:      document.getElementById('eventoTipo').value
    });
    salvarEventosList();
    fecharModalEvento();
    renderizarCalendario();
    mostrarNotificacao('Evento adicionado!');
}

function excluirEvento(id) {
    abrirConfirmacao('Excluir este evento?', () => {
        eventos = eventos.filter(e => e.id !== id);
        salvarEventosList();
        renderizarCalendario();
        mostrarNotificacao('Evento excluído.');
    });
}

function mesAnterior() { calMes--; if (calMes < 0)  { calMes = 11; calAno--; } renderizarCalendario(); }
function mesProximo()  { calMes++; if (calMes > 11) { calMes = 0;  calAno++; } renderizarCalendario(); }

document.addEventListener('DOMContentLoaded', () => { eventos = carregarEventos(); });
