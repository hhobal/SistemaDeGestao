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

async function renderizarKanban() {
    tarefas = await carregarTarefasDoBanco();
    _desenharKanban();
}

function _desenharKanban() {
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    board.innerHTML = COLUNAS_KANBAN.map(col => {
        const lista = tarefas.filter(t => t.status === col.id);
        const cards = lista.map(t => {
            const priCor = { alta: 'var(--danger)', media: 'var(--warning)', baixa: 'var(--success)' }[t.prioridade] || 'var(--text-muted)';
            const hoje = new Date().toISOString().split('T')[0];
            const dataLimiteISO = t.dataLimite ? String(t.dataLimite).split('T')[0] : null;
            const atrasada = dataLimiteISO && dataLimiteISO < hoje && t.status !== 'concluido';
            const resp = t.responsavel?.nome || null;
            return html`
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
                ${t.descricao ? html`<div class="kanban-card-meta">${t.descricao}</div>` : ''}
                <div class="kanban-card-footer">
                    ${dataLimiteISO ? html`<span style="font-size:10px;color:${atrasada ? 'var(--danger)' : 'var(--text-muted)'}"><i class="fa-solid fa-calendar-day"></i> ${new Date(dataLimiteISO+'T12:00:00').toLocaleDateString('pt-BR')}</span>` : '<span></span>'}
                    ${resp ? html`<span class="t-10 t-mudo"><i class="fa-solid fa-user"></i> ${resp.split(' ')[0]}</span>` : ''}
                </div>
            </div>`;
        });

        // Abaixo, a coluna vazia é decidida por cards.length e não por
        // um "||": em JavaScript um array vazio é truthy, então o
        // operador nunca cairia no texto alternativo.
        return html`
        <div class="kanban-col"
             ondragover="event.preventDefault()"
             ondrop="dropTarefa('${col.id}')">
            <div class="kanban-col-header">
                <h4><i class="fa-solid ${col.icone}" style="color:${col.cor}"></i> ${col.label}</h4>
                <span class="kanban-count">${lista.length}</span>
            </div>
            <div class="kanban-col-body">${cards.length ? cards : html`<div class="kanban-vazio">Nenhuma tarefa</div>`}</div>
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

async function dropTarefa(novoStatus) {
    if (dragTarefaId === null) return;
    const id = dragTarefaId;
    dragTarefaId = null;
    try {
        await alterarStatusTarefaNoBanco(id, novoStatus);
        await renderizarKanban();
        mostrarNotificacao(`Tarefa movida para "${COLUNAS_KANBAN.find(c=>c.id===novoStatus)?.label}".`);
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível mover a tarefa.', 'erro');
        await renderizarKanban();
    }
}

// ─── SALVAR ────────────────────────────

async function salvarTarefa() {
    if (!validarCampos([{ id: 'tarefaTitulo' }])) return;

    const modal = document.getElementById('modalTarefa');
    const editId = modal._editId;

    const dataLimite = document.getElementById('tarefaDataLimite')?.value || '';
    const responsavelId = document.getElementById('tarefaResponsavel')?.value || '';

    const dados = {
        titulo:        document.getElementById('tarefaTitulo').value.trim(),
        descricao:     document.getElementById('tarefaDesc').value.trim(),
        prioridade:    document.getElementById('tarefaPrioridade').value,
        status:        document.getElementById('tarefaStatus').value,
        dataLimite:    dataLimite ? new Date(dataLimite + 'T12:00:00').toISOString() : null,
        responsavelId: responsavelId ? Number(responsavelId) : null
    };

    try {
        await salvarTarefaNoBanco(dados, editId);
        fecharModalTarefa();
        await renderizarKanban();
        mostrarNotificacao(editId ? 'Tarefa atualizada!' : 'Tarefa criada!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar a tarefa.', 'erro');
    }
}

function excluirTarefa(id) {
    abrirConfirmacao('Excluir esta tarefa?', async () => {
        try {
            await excluirTarefaNoBanco(id);
            await renderizarKanban();
            mostrarNotificacao('Tarefa excluída.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir a tarefa.', 'erro');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => { tarefas = carregarTarefas(); });
