// ======================================
// NOTAS
// ======================================

let notas = [];

async function renderizarNotas() {
    notas = await carregarNotasDoBanco();
    _desenharGridNotas();
}

function _desenharGridNotas() {
    const grid = document.getElementById('notasGrid');
    if (!grid) return;

    if (notas.length === 0) {
        grid.innerHTML = `<div style="color:var(--text-muted);font-size:13px;grid-column:1/-1;text-align:center;padding:40px"><i class="fa-solid fa-note-sticky" style="font-size:32px;display:block;margin-bottom:12px;opacity:.3"></i>Nenhuma nota. Clique em "Nova Nota" para criar.</div>`;
        return;
    }

    grid.innerHTML = notas.map(n => `
        <div class="nota-card" style="background:${n.cor || 'var(--bg-card)'}">
            <div class="nota-card-header">
                <h4>${n.titulo}</h4>
                <div style="display:flex;gap:4px">
                    <button onclick="abrirModalNota(${n.id})" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="excluirNota(${n.id})"   style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <p>${n.conteudo || '<em style="opacity:.5">Sem conteúdo</em>'}</p>
            <div class="nota-date">${n.criadoEm ? new Date(n.criadoEm).toLocaleDateString('pt-BR') : ''}</div>
        </div>`).join('');
}

async function salvarNota() {
    if (!validarCampos([{ id: 'notaTitulo' }])) return;

    const modal = document.getElementById('modalNota');
    const editId = modal._editId;

    const dados = {
        titulo:   document.getElementById('notaTitulo').value.trim(),
        conteudo: document.getElementById('notaConteudo').value.trim(),
        cor:      document.getElementById('notaCor').value
    };

    try {
        await salvarNotaNoBanco(dados, editId);
        fecharModalNota();
        await renderizarNotas();
        mostrarNotificacao(editId ? 'Nota atualizada!' : 'Nota salva!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar a nota.', 'erro');
    }
}

function excluirNota(id) {
    abrirConfirmacao('Excluir esta nota?', async () => {
        try {
            await excluirNotaNoBanco(id);
            await renderizarNotas();
            mostrarNotificacao('Nota excluída.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir a nota.', 'erro');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => { notas = carregarNotas(); });
