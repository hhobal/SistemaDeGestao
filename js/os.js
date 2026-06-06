// ======================================
// ORDENS DE SERVIÇO
// ======================================

let ordensServico = [];
const OS_POR_PAGINA = 10;
let paginaAtualOS = 1;
let filtroStatusOS = '';

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
         (os.nro||'').toLowerCase().includes(filtro) ||
         (os.cliente||'').toLowerCase().includes(filtro)) &&
        (sf ? os.status === sf : true)
    );
}

function renderizarOS() {
    ordensServico = carregarOS();
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
        tabela.innerHTML = pagina.map(os => `
            <tr>
                <td><span style="font-family:monospace;font-weight:700;color:var(--accent)">#${os.nro}</span></td>
                <td>
                    <strong>${os.titulo}</strong>
                    <br><span style="font-size:11px;color:var(--text-muted)">${os.descricao ? os.descricao.slice(0,60)+(os.descricao.length>60?'…':'') : ''}</span>
                </td>
                <td>${os.cliente || '—'}</td>
                <td>${os.responsavel || '—'}</td>
                <td><span style="color:${priCor[os.prioridade]||'var(--accent)'}"><i class="fa-solid fa-flag" style="font-size:10px"></i> ${os.prioridade||'normal'}</span></td>
                <td><span class="status-badge ${statusCls[os.status]||'status-pendente'}">${statusNome[os.status]||os.status}</span></td>
                <td>${fmt(os.valor)}</td>
                <td>${os.dataAbertura || '—'}</td>
                <td>
                    <button class="btn-icon" title="Editar" onclick="abrirModalOS(${os.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirOS(${os.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join('');
    }

    renderizarPaginacao('paginacaoOS', filtrados.length, OS_POR_PAGINA, paginaAtualOS, 'mudarPaginaOS');

    // Cards de resumo
    const abertas   = ordensServico.filter(os => os.status === 'aberta').length;
    const andamento = ordensServico.filter(os => os.status === 'andamento').length;
    const concluidas= ordensServico.filter(os => os.status === 'concluida').length;
    const faturado  = ordensServico.filter(os => os.status === 'concluida').reduce((s, os) => s + Number(os.valor||0), 0);

    const el = id => document.getElementById(id);
    if (el('osAbertas'))   el('osAbertas').textContent = abertas;
    if (el('osAndamento')) el('osAndamento').textContent = andamento;
    if (el('osConcluidas'))el('osConcluidas').textContent = concluidas;
    if (el('osFaturado'))  el('osFaturado').textContent = faturado.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function salvarOrdemServico() {
    if (!validarCampos([{ id: 'osTitulo' }, { id: 'osCliente' }])) return;

    const modal = document.getElementById('modalOS');
    const editId = modal._editId;

    const clienteId = document.getElementById('osCliente').value;
    const responsavelId = document.getElementById('osResponsavel').value;
    const clienteObj = carregarClientes().find(c => String(c.id) === String(clienteId));
    const respObj    = carregarUsuarios().find(u => String(u.id) === String(responsavelId));

    const dados = {
        titulo:       document.getElementById('osTitulo').value.trim(),
        descricao:    document.getElementById('osDescricao').value.trim(),
        observacao:   document.getElementById('osObservacao').value.trim(),
        status:       document.getElementById('osStatus').value,
        prioridade:   document.getElementById('osPrioridade').value,
        valor:        parseFloat(document.getElementById('osValor').value) || 0,
        clienteId:    clienteId,
        cliente:      clienteObj?.nome || '',
        responsavelId:responsavelId,
        responsavel:  respObj?.nome || ''
    };

    ordensServico = carregarOS();

    if (editId !== null && editId !== undefined) {
        const os = ordensServico.find(x => x.id === editId);
        if (os) {
            const statusAnterior = os.status;
            Object.assign(os, dados);
            if (dados.status === 'concluida' && !os.dataConclusao) {
                os.dataConclusao = new Date().toLocaleDateString('pt-BR');
            }
        }
        registrarLog('Editar', 'O.S.', `#${ordensServico.find(x=>x.id===editId)?.nro} ${dados.titulo}`);
    } else {
        const novoNro = ordensServico.length > 0 ? String(Math.max(...ordensServico.map(x => parseInt(x.nro)||0)) + 1).padStart(4, '0') : '0001';
        ordensServico.push({
            id: _nextId(ordensServico),
            nro: novoNro,
            dataAbertura: new Date().toLocaleDateString('pt-BR'),
            ...dados
        });
        registrarLog('Criar', 'O.S.', `#${novoNro} ${dados.titulo}`);
    }

    salvarOS();
    fecharModalOS();
    renderizarOS();
    atualizarTudo();
    mostrarNotificacao(editId ? 'O.S. atualizada!' : 'O.S. criada!');
}

function excluirOS(id) {
    const os = ordensServico.find(x => x.id === id);
    abrirConfirmacao(`Excluir a O.S. "#${os?.nro} - ${os?.titulo}"?`, () => {
        ordensServico = ordensServico.filter(x => x.id !== id);
        salvarOS();
        renderizarOS();
        atualizarTudo();
        registrarLog('Excluir', 'O.S.', `#${os?.nro}`);
        mostrarNotificacao('O.S. excluída.');
    }, 'Excluir O.S.');
}

document.addEventListener('DOMContentLoaded', () => {
    ordensServico = carregarOS();
});
