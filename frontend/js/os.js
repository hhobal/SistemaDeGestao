// ======================================
// ORDENS DE SERVIÇO
// ======================================

let ordensServico = [];
const OS_POR_PAGINA = 10;
let paginaAtualOS = 1;

function mudarPaginaOS(p) {
    const total = Math.ceil(_filtrarOS().length / OS_POR_PAGINA);
    if (p < 1 || p > total) return;
    paginaAtualOS = p;
    renderizarOS();
}

function _filtrarOS() {
    const filtro = (document.getElementById('pesquisaOS')?.value || '').toLowerCase();
    const sf = document.getElementById('filtroStatusOS')?.value || '';
    return ordensServico.filter(os =>
        ((os.titulo||'').toLowerCase().includes(filtro) ||
         (os.numero||'').toLowerCase().includes(filtro) ||
         (os.cliente?.nome||'').toLowerCase().includes(filtro)) &&
        (sf ? os.status === sf : true)
    );
}

async function renderizarOS() {
    const [resumo, lista] = await Promise.all([
        apiRequest('/os/resumo').catch(() => ({ abertas: 0, andamento: 0, concluidas: 0, faturado: 0 })),
        carregarOSDoBanco()
    ]);
    ordensServico = lista;
    _desenharTabelaOS();

    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    const el = id => document.getElementById(id);
    if (el('osAbertas'))    el('osAbertas').textContent    = resumo.abertas;
    if (el('osAndamento'))  el('osAndamento').textContent  = resumo.andamento;
    if (el('osConcluidas')) el('osConcluidas').textContent = resumo.concluidas;
    if (el('osFaturado'))   el('osFaturado').textContent   = fmt(resumo.faturado);
}

function _desenharTabelaOS() {
    const tabela = document.getElementById('tabelaOS');
    if (!tabela) return;

    const filtrados = _filtrarOS();
    const inicio = (paginaAtualOS - 1) * OS_POR_PAGINA;
    const pagina = filtrados.slice(inicio, inicio + OS_POR_PAGINA);
    const fmt = v => Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const statusCls = { aberta: 'status-pendente', andamento: 'status-processando', concluida: 'status-entregue', cancelada: 'status-cancelado' };
    const statusNome = { aberta: 'Aberta', andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' };
    const priCor = { urgente: 'var(--danger)', alta: 'var(--warning)', normal: 'var(--accent)', baixa: 'var(--text-muted)' };

    if (pagina.length === 0) {
        tabela.innerHTML = emptyState('Nenhuma ordem de serviço encontrada.', 'fa-screwdriver-wrench', 'Clique em "+ Nova O.S." para criar.');
    } else {
        tabela.innerHTML = pagina.map(os => {
            const podeEditarStatus = !['concluida', 'cancelada'].includes(os.status);
            const dataAberturaFmt = os.dataAbertura ? new Date(os.dataAbertura).toLocaleDateString('pt-BR') : '—';
            const statusSelect = podeEditarStatus
                ? `<select class="status-select" onchange="alterarStatusOS(${os.id}, this.value)" style="background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);padding:4px 8px;border-radius:6px;font-size:12px;cursor:pointer">
                     <option value="aberta"    ${os.status==='aberta'   ?'selected':''}>Aberta</option>
                     <option value="andamento" ${os.status==='andamento'?'selected':''}>Em andamento</option>
                     <option value="concluida" ${os.status==='concluida'?'selected':''}>Concluída</option>
                     <option value="cancelada" ${os.status==='cancelada'?'selected':''}>Cancelada</option>
                   </select>`
                : `<span class="status-badge ${statusCls[os.status]||'status-pendente'}">${statusNome[os.status]||os.status}</span>`;
            return `
            <tr>
                <td><span style="font-family:monospace;font-weight:700;color:var(--accent)">#${os.numero}</span></td>
                <td>
                    <strong>${os.titulo}</strong>
                    <br><span style="font-size:11px;color:var(--text-muted)">${os.descricao ? os.descricao.slice(0,60)+(os.descricao.length>60?'…':'') : ''}</span>
                </td>
                <td>${os.cliente?.nome || '—'}</td>
                <td>${os.responsavel?.nome || '—'}</td>
                <td><span style="color:${priCor[os.prioridade]||'var(--accent)'}"><i class="fa-solid fa-flag" style="font-size:10px"></i> ${os.prioridade||'normal'}</span></td>
                <td>${statusSelect}</td>
                <td>${fmt(os.valor)}</td>
                <td>${dataAberturaFmt}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="abrirModalOS(${os.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirOS(${os.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    renderizarPaginacao('paginacaoOS', filtrados.length, OS_POR_PAGINA, paginaAtualOS, 'mudarPaginaOS');
}

async function salvarOrdemServico() {
    if (!validarCampos([{ id: 'osTitulo' }, { id: 'osCliente' }])) return;

    const modal = document.getElementById('modalOS');
    const editId = modal._editId;

    const clienteId = document.getElementById('osCliente').value;
    const responsavelId = document.getElementById('osResponsavel').value;

    const dados = {
        titulo:        document.getElementById('osTitulo').value.trim(),
        descricao:     document.getElementById('osDescricao').value.trim(),
        observacao:    document.getElementById('osObservacao').value.trim(),
        prioridade:    document.getElementById('osPrioridade').value,
        valor:         parseFloat(document.getElementById('osValor').value) || 0,
        clienteId:     clienteId ? Number(clienteId) : null,
        responsavelId: responsavelId ? Number(responsavelId) : null
    };

    // Observação: o schema de criação do backend não tem campo "status"
    // (toda O.S. nova nasce "aberta" por padrão no banco). Não enviamos
    // nada aqui — o valor abaixo nunca é necessário, mas é inofensivo
    // caso o backend evolua para aceitar um status inicial customizado.

    try {
        await salvarOSNoBanco(dados, editId);
        fecharModalOS();
        await renderizarOS();
        if (typeof atualizarTudo === 'function') atualizarTudo();
        mostrarNotificacao(editId ? 'O.S. atualizada!' : 'O.S. criada!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar a O.S.', 'erro');
    }
}

async function alterarStatusOS(id, novoStatus) {
    try {
        await alterarStatusOSNoBanco(id, novoStatus);
        await renderizarOS();
        if (typeof atualizarTudo === 'function') atualizarTudo();
        mostrarNotificacao(`O.S. atualizada para "${novoStatus}".`);
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível alterar o status.', 'erro');
        await renderizarOS(); // reverte o select para o valor real do banco
    }
}

function excluirOS(id) {
    const os = ordensServico.find(x => String(x.id) === String(id));
    abrirConfirmacao(`Excluir a O.S. "#${os?.numero} - ${os?.titulo}"?`, async () => {
        try {
            await excluirOSNoBanco(id);
            await renderizarOS();
            if (typeof atualizarTudo === 'function') atualizarTudo();
            mostrarNotificacao('O.S. excluída.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir a O.S.', 'erro');
        }
    }, 'Excluir O.S.');
}

document.addEventListener('DOMContentLoaded', () => {
    ordensServico = carregarOS();
});
