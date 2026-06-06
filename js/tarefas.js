// ======================================
// TAREFAS - KANBAN COM DRAG & DROP
// ======================================

let tarefas = [];
let dragTarefaId = null;

const COLUNAS_KANBAN = [
    { id: 'backlog',   label: 'A Fazer',      icone: 'fa-circle-dot',     cor: 'var(--text-muted)' },
    { id: 'andamento', label: 'Em Andamento',  icone: 'fa-spinner',        cor: 'var(--accent)' },
    { id: 'revisao',   label: 'Em Revisão',    icone: 'fa-magnifying-glass',cor: 'var(--warning)' },
    { id: 'concluido', label: 'Concluído',     icone: 'fa-circle-check',   cor: 'var(--success)' }
];

function renderizarKanban() {
    tarefas = carregarTarefas();
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    board.innerHTML = COLUNAS_KANBAN.map(col => {
        const lista = tarefas.filter(t => t.status === col.id);
        const cards = lista.map(t => {
            const priCor = { alta: 'var(--danger)', media: 'var(--warning)', baixa: 'var(--success)' }[t.prioridade] || 'var(--text-muted)';
            const hoje = new Date().toISOString().split('T')[0];
            const atrasada = t.dataLimite && t.dataLimite < hoje && t.status !== 'concluido';
            const resp = t.responsavelId ? carregarUsuarios().find(u => String(u.id) === String(t.responsavelId))?.nome : null;
            return `
            <div class="kanban-card ${atrasada ? 'kanban-card-atrasada' : ''}"
                 draggable="true"
                 ondragstart="dragStartTarefa(${t.id})"
                 ondragend="dragEndTarefa()">
                <div class="kanban-card-header">
                    <span style="color:${priCor};font-size:10px;font-weight:700;text-transform:uppercase"><i class="fa-solid fa-flag"></i> ${t.prioridade}</span>
                    <div style="display:flex;gap:4px">
                        <button onclick="abrirModalTarefa(${t.id})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="excluirTarefa(${t.id})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px" title="Excluir"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                </div>
                <div class="kanban-card-title">${t.titulo}</div>
                ${t.desc ? `<div class="kanban-card-meta">${t.desc}</div>` : ''}
                <div class="kanban-card-footer">
                    ${t.dataLimite ? `<span style="font-size:10px;color:${atrasada ? 'var(--danger)' : 'var(--text-muted)'}"><i class="fa-solid fa-calendar-day"></i> ${new Date(t.dataLimite+'T12:00:00').toLocaleDateString('pt-BR')}</span>` : '<span></span>'}
                    ${resp ? `<span style="font-size:10px;color:var(--text-muted)"><i class="fa-solid fa-user"></i> ${resp.split(' ')[0]}</span>` : ''}
                </div>
            </div>`;
        }).join('') || `<div class="kanban-vazio">Nenhuma tarefa</div>`;

        return `
        <div class="kanban-col"
             ondragover="event.preventDefault()"
             ondrop="dropTarefa('${col.id}')">
            <div class="kanban-col-header">
                <h4><i class="fa-solid ${col.icone}" style="color:${col.cor}"></i> ${col.label}</h4>
                <span class="kanban-count">${lista.length}</span>
            </div>
            <div class="kanban-col-body">${cards}</div>
        </div>`;
    }).join('');
}

// ─── DRAG & DROP ───────────────────────

function dragStartTarefa(id) {
    dragTarefaId = id;
}

function dragEndTarefa() {
    dragTarefaId = null;
}

function dropTarefa(novoStatus) {
    if (dragTarefaId === null) return;
    tarefas = carregarTarefas();
    const t = tarefas.find(x => x.id === dragTarefaId);
    if (t) {
        t.status = novoStatus;
        salvarTarefasList();
        renderizarKanban();
        mostrarNotificacao(`Tarefa movida para "${COLUNAS_KANBAN.find(c=>c.id===novoStatus)?.label}".`);
    }
    dragTarefaId = null;
}

// ─── SALVAR ────────────────────────────

function salvarTarefa() {
    if (!validarCampos([{ id: 'tarefaTitulo' }])) return;

    const modal = document.getElementById('modalTarefa');
    const editId = modal._editId;

    const dados = {
        titulo:        document.getElementById('tarefaTitulo').value.trim(),
        desc:          document.getElementById('tarefaDesc').value.trim(),
        prioridade:    document.getElementById('tarefaPrioridade').value,
        status:        document.getElementById('tarefaStatus').value,
        dataLimite:    document.getElementById('tarefaDataLimite')?.value || '',
        responsavelId: document.getElementById('tarefaResponsavel')?.value || ''
    };

    tarefas = carregarTarefas();

    if (editId !== null && editId !== undefined) {
        const t = tarefas.find(x => x.id === editId);
        if (t) Object.assign(t, dados);
    } else {
        tarefas.push({ id: Date.now(), ...dados });
    }

    salvarTarefasList();
    fecharModalTarefa();
    renderizarKanban();
    mostrarNotificacao(editId ? 'Tarefa atualizada!' : 'Tarefa criada!');
}

function excluirTarefa(id) {
    abrirConfirmacao('Excluir esta tarefa?', () => {
        tarefas = tarefas.filter(t => t.id !== id);
        salvarTarefasList();
        renderizarKanban();
        mostrarNotificacao('Tarefa excluída.');
    });
}

document.addEventListener('DOMContentLoaded', () => { tarefas = carregarTarefas(); });
