// ======================================
// APP PRINCIPAL V6 - SISTEMA DE SERVIÇOS
// ======================================

const secoes = {
    dashboard:    'dashboardSection',
    pedidos:      'pedidosSection',
    clientes:     'clientesSection',
    fornecedores: 'fornecedoresSection',
    produtos:     'produtosSection',
    estoque:      'estoqueSection',
    os:           'osSection',
    financas:     'financasSection',
    agenda:       'agendaSection',
    tarefas:      'tarefasSection',
    notas:        'notasSection',
    relatorios:   'relatoriosSection',
    usuarios:     'usuariosSection'
};

const paginaTitulos = {
    dashboard:    ['Dashboard',           'Visão geral do sistema'],
    pedidos:      ['Pedidos da Loja',     'Pedidos realizados na loja virtual'],
    clientes:     ['Clientes',            'Gestão de clientes'],
    fornecedores: ['Fornecedores',        'Gestão de fornecedores'],
    produtos:     ['Produtos / Serviços', 'Catálogo de produtos e serviços'],
    estoque:      ['Estoque',             'Controle de estoque'],
    os:           ['Ordens de Serviço',   'Gestão de O.S.'],
    financas:     ['Finanças',            'Controle financeiro'],
    agenda:       ['Agenda',              'Compromissos e eventos'],
    tarefas:      ['Tarefas',             'Quadro Kanban'],
    notas:        ['Notas',               'Anotações rápidas'],
    relatorios:   ['Relatórios',          'Análises e gráficos'],
    usuarios:     ['Usuários',            'Gerenciamento de acesso']
};

// ─── NAVEGAÇÃO ─────────────────────────

function mostrarSecao(secao) {
    Object.values(secoes).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const alvo = document.getElementById(secoes[secao]);
    if (alvo) alvo.style.display = 'block';

    atualizarMenuAtivo(secao);

    const info = paginaTitulos[secao];
    if (info) {
        const t = document.getElementById('paginaTitulo');
        const s = document.getElementById('paginaSubtitulo');
        if (t) t.textContent = info[0];
        if (s) s.textContent = info[1];
    }

    if (secao === 'dashboard')    atualizarDashboard();
    if (secao === 'pedidos')      renderizarPedidos();
    if (secao === 'relatorios')   renderizarRelatorios();
    if (secao === 'estoque')      atualizarEstoque();
    if (secao === 'financas')     atualizarFinancas();
    if (secao === 'agenda')       renderizarCalendario();
    if (secao === 'tarefas')      renderizarKanban();
    if (secao === 'notas')        renderizarNotas();
    if (secao === 'os')           renderizarOS();
    if (secao === 'clientes')     carregarClientesNaTela();
    if (secao === 'produtos')     renderizarProdutos();
    if (secao === 'fornecedores') renderizarFornecedores();
    if (secao === 'usuarios')     renderizarUsuarios();
}

function atualizarMenuAtivo(secao) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(item => {
        const oc = item.getAttribute('onclick') || '';
        const ds = item.getAttribute('data-secao') || '';
        if (oc.includes(`'${secao}'`) || ds === secao) item.classList.add('active');
    });
}

// ─── SIDEBAR ───────────────────────────

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
}

// ─── MODAL GENÉRICO ────────────────────

function abrirModal(id)  { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

// Fechar modal clicando fora
window.addEventListener('click', e => {
    document.querySelectorAll('.modal').forEach(modal => {
        if (e.target === modal) modal.style.display = 'none';
    });
});

// Fechar modal com ESC
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
});

// ─── CONFIRMAÇÃO MODAL ─────────────────

let _confirmCallback = null;

function abrirConfirmacao(mensagem, onConfirmar, titulo = 'Confirmar ação') {
    document.getElementById('confirmTitulo').textContent = titulo;
    document.getElementById('confirmMensagem').textContent = mensagem;
    _confirmCallback = onConfirmar;
    abrirModal('modalConfirm');
}

function confirmarAcao() {
    fecharModal('modalConfirm');
    if (typeof _confirmCallback === 'function') _confirmCallback();
    _confirmCallback = null;
}

// Alias para compatibilidade
function confirmar(mensagem) {
    return window.confirm(mensagem);
}

// ─── MODAIS CLIENTE ────────────────────

function abrirModalCliente(id = null) {
    ['clienteNome','clienteEmail','clienteTelefone','clienteCpf','clienteEndereco','clienteObservacao'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    document.getElementById('clienteStatus').value = 'ativo';
    const modal = document.getElementById('modalCliente');
    modal._editId = id;
    if (id !== null) {
        const c = carregarClientes().find(x => String(x.id) === String(id));
        if (c) {
            document.getElementById('clienteNome').value = c.nome || '';
            document.getElementById('clienteEmail').value = c.email || '';
            document.getElementById('clienteTelefone').value = c.telefone || '';
            document.getElementById('clienteCpf').value = c.cpf || '';
            document.getElementById('clienteEndereco').value = c.endereco || '';
            document.getElementById('clienteObservacao').value = c.observacao || '';
            document.getElementById('clienteStatus').value = c.status || 'ativo';
        }
    }
    abrirModal('modalCliente');
}
function fecharModalCliente() { fecharModal('modalCliente'); }

// ─── MODAIS FORNECEDOR ─────────────────

function abrirModalFornecedor(id = null) {
    ['fornecedorEmpresa','fornecedorContato','fornecedorTelefone','fornecedorEmail','fornecedorCnpj'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    document.getElementById('fornecedorCategoria').value = '';
    const modal = document.getElementById('modalFornecedor');
    modal._editId = id;
    if (id !== null) {
        const f = carregarFornecedores().find(x => String(x.id) === String(id));
        if (f) {
            document.getElementById('fornecedorEmpresa').value = f.empresa || '';
            document.getElementById('fornecedorContato').value = f.contato || '';
            document.getElementById('fornecedorTelefone').value = f.telefone || '';
            document.getElementById('fornecedorEmail').value = f.email || '';
            document.getElementById('fornecedorCnpj').value = f.cnpj || '';
            document.getElementById('fornecedorCategoria').value = f.categoria || '';
        }
    }
    abrirModal('modalFornecedor');
}
function fecharModalFornecedor() { fecharModal('modalFornecedor'); }

// ─── MODAIS PRODUTO ────────────────────

function abrirModalProduto(id = null) {
    ['produtoNome','produtoPreco','produtoCusto','produtoEstoque','produtoEstoqueMin','produtoCodigo','produtoDescricao'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    document.getElementById('produtoCategoria').value = '';
    const modal = document.getElementById('modalProduto');
    modal._editId = id;
    if (id !== null) {
        const p = carregarProdutos().find(x => String(x.id) === String(id));
        if (p) {
            document.getElementById('produtoNome').value = p.nome || '';
            document.getElementById('produtoCategoria').value = p.categoria || '';
            document.getElementById('produtoPreco').value = p.preco || '';
            document.getElementById('produtoCusto').value = p.custo || '';
            document.getElementById('produtoEstoque').value = p.estoque || 0;
            document.getElementById('produtoEstoqueMin').value = p.estoqueMin || 0;
            document.getElementById('produtoCodigo').value = p.codigo || '';
            document.getElementById('produtoDescricao').value = p.descricao || '';
        }
    }
    abrirModal('modalProduto');
}
function fecharModalProduto() { fecharModal('modalProduto'); }

// ─── MODAIS ESTOQUE ────────────────────

async function abrirModalMovimento() {
    const sel = document.getElementById('movProduto');
    sel.innerHTML = '';
    const listaProdutos = await carregarProdutosDoBanco();
    listaProdutos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.nome} (estoque: ${p.estoque || 0})`;
        sel.appendChild(opt);
    });
    document.getElementById('movQtd').value = '';
    document.getElementById('movMotivo').value = '';
    document.getElementById('movTipo').value = 'entrada';
    abrirModal('modalMovimento');
}
function fecharModalMovimento() { fecharModal('modalMovimento'); }

// ─── MODAIS ORDEM DE SERVIÇO ───────────

async function abrirModalOS(id = null) {
    ['osTitulo','osDescricao','osObservacao','osValor'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    document.getElementById('osStatus').value = 'aberta';
    document.getElementById('osPrioridade').value = 'normal';

    const [listaClientes, listaUsuarios] = await Promise.all([
        carregarClientesDoBanco(),
        carregarUsuariosDoBanco()
    ]);

    const selC = document.getElementById('osCliente');
    const selR = document.getElementById('osResponsavel');
    selC.innerHTML = '<option value="">Selecione o cliente...</option>';
    selR.innerHTML = '<option value="">Selecione o responsável...</option>';
    listaClientes.forEach(c => {
        selC.innerHTML += html`<option value="${c.id}">${c.nome}</option>`;
    });
    listaUsuarios.filter(u => u.perfil !== 'Visitante').forEach(u => {
        selR.innerHTML += html`<option value="${u.id}">${u.nome}</option>`;
    });

    const modal = document.getElementById('modalOS');
    modal._editId = id;

    if (id !== null) {
        const os = carregarOS().find(x => String(x.id) === String(id));
        if (os) {
            document.getElementById('osTitulo').value = os.titulo || '';
            document.getElementById('osDescricao').value = os.descricao || '';
            document.getElementById('osObservacao').value = os.observacao || '';
            document.getElementById('osValor').value = os.valor || '';
            document.getElementById('osStatus').value = os.status || 'aberta';
            document.getElementById('osPrioridade').value = os.prioridade || 'normal';
            document.getElementById('osCliente').value = os.clienteId ?? os.cliente?.id ?? '';
            document.getElementById('osResponsavel').value = os.responsavelId ?? os.responsavel?.id ?? '';
        }
    }
    abrirModal('modalOS');
}
function fecharModalOS() { fecharModal('modalOS'); }

// ─── MODAIS FINANCEIRO ─────────────────

function abrirModalLancamento(id = null) {
    ['lancDescricao','lancValor'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('lancCategoria').value = '';
    document.getElementById('lancTipo').value = 'receita';
    document.getElementById('lancStatus').value = 'pago';
    document.getElementById('lancData').value = new Date().toISOString().split('T')[0];
    const modal = document.getElementById('modalLancamento');
    modal._editId = id;
    if (id !== null) {
        const l = lancamentos.find(x => String(x.id) === String(id));
        if (l) {
            document.getElementById('lancDescricao').value = l.descricao || '';
            document.getElementById('lancValor').value = l.valor || '';
            document.getElementById('lancCategoria').value = l.categoria || '';
            document.getElementById('lancTipo').value = l.tipo || 'receita';
            document.getElementById('lancStatus').value = l.status || 'pago';
            document.getElementById('lancData').value = l.data ? String(l.data).split('T')[0] : new Date().toISOString().split('T')[0];
        }
    }
    abrirModal('modalLancamento');
}
function fecharModalLancamento() { fecharModal('modalLancamento'); }

// ─── MODAIS EVENTO ─────────────────────

function abrirModalEvento(dataPreenchida = '') {
    document.getElementById('eventoTitulo').value = '';
    document.getElementById('eventoDescricao').value = '';
    document.getElementById('eventoData').value = dataPreenchida;
    document.getElementById('eventoHora').value = '';
    document.getElementById('eventoTipo').value = 'reuniao';
    abrirModal('modalEvento');
}
function fecharModalEvento() { fecharModal('modalEvento'); }

// ─── MODAIS TAREFA ─────────────────────

async function abrirModalTarefa(id = null) {
    ['tarefaTitulo','tarefaDesc','tarefaDataLimite'].forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = '';
    });
    document.getElementById('tarefaPrioridade').value = 'media';
    document.getElementById('tarefaStatus').value = 'backlog';

    const selR = document.getElementById('tarefaResponsavel');
    if (selR) {
        const listaUsuarios = await carregarUsuariosDoBanco();
        selR.innerHTML = '<option value="">Sem responsável</option>';
        listaUsuarios.forEach(u => {
            selR.innerHTML += html`<option value="${u.id}">${u.nome}</option>`;
        });
    }

    const modal = document.getElementById('modalTarefa');
    modal._editId = id;
    if (id !== null) {
        const t = tarefas.find(x => String(x.id) === String(id));
        if (t) {
            document.getElementById('tarefaTitulo').value = t.titulo || '';
            document.getElementById('tarefaDesc').value = t.descricao || '';
            document.getElementById('tarefaPrioridade').value = t.prioridade || 'media';
            document.getElementById('tarefaStatus').value = t.status || 'backlog';
            if (document.getElementById('tarefaDataLimite')) document.getElementById('tarefaDataLimite').value = t.dataLimite ? String(t.dataLimite).split('T')[0] : '';
            if (document.getElementById('tarefaResponsavel')) document.getElementById('tarefaResponsavel').value = t.responsavelId ?? t.responsavel?.id ?? '';
        }
    }
    abrirModal('modalTarefa');
}
function fecharModalTarefa() { fecharModal('modalTarefa'); }

// ─── MODAIS NOTA ───────────────────────

function abrirModalNota(id = null) {
    document.getElementById('notaTitulo').value = '';
    document.getElementById('notaConteudo').value = '';
    document.getElementById('notaCor').value = '#1e2430';
    const modal = document.getElementById('modalNota');
    modal._editId = id;
    if (id !== null) {
        const n = notas.find(x => String(x.id) === String(id));
        if (n) {
            document.getElementById('notaTitulo').value = n.titulo || '';
            document.getElementById('notaConteudo').value = n.conteudo || '';
            document.getElementById('notaCor').value = n.cor || '#1e2430';
        }
    }
    abrirModal('modalNota');
}
function fecharModalNota() { fecharModal('modalNota'); }

// ─── MODAIS USUÁRIO ────────────────────

function abrirModalUsuario(id = null) {
    ['usuarioNome','usuarioUsername','usuarioSenha'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('usuarioPerfil').value = 'Operador';
    document.getElementById('usuarioAtivo').checked = true;
    const senhaLabel = document.getElementById('labelSenha');
    const modal = document.getElementById('modalUsuario');
    modal._editId = id;

    if (id !== null) {
        if (senhaLabel) senhaLabel.textContent = 'Nova senha (deixe em branco para manter)';
        const u = carregarUsuarios().find(x => String(x.id) === String(id));
        if (u) {
            document.getElementById('usuarioNome').value = u.nome || '';
            document.getElementById('usuarioUsername').value = u.usuario || '';
            document.getElementById('usuarioPerfil').value = u.perfil || 'Operador';
            document.getElementById('usuarioAtivo').checked = u.ativo !== false;
        }
    } else {
        if (senhaLabel) senhaLabel.textContent = 'Senha';
    }
    abrirModal('modalUsuario');
}
function fecharModalUsuario() { fecharModal('modalUsuario'); }

// ─── MODAIS PERFIL ─────────────────────

function abrirModalPerfil() {
    const sessao = carregarSessao();
    if (!sessao) return;
    document.getElementById('perfilNome').value = sessao.nome || '';
    document.getElementById('perfilSenhaAtual').value = '';
    document.getElementById('perfilNovaSenha').value = '';
    abrirModal('modalPerfil');
}
function fecharModalPerfil() { fecharModal('modalPerfil'); }

// ─── BUSCA GLOBAL ──────────────────────

function abrirBuscaGlobal() {
    document.getElementById('buscaGlobalInput').value = '';
    document.getElementById('buscaGlobalResultados').innerHTML = '';
    abrirModal('modalBuscaGlobal');
    setTimeout(() => document.getElementById('buscaGlobalInput').focus(), 100);
    // Pré-carrega os dados usados pela busca (cache pode estar vazio se a
    // seção correspondente nunca foi visitada nesta sessão).
    Promise.all([
        carregarClientesDoBanco(),
        carregarProdutosDoBanco(),
        carregarOSDoBanco(),
        carregarFornecedoresDoBanco()
    ]).catch(() => {});
}
function fecharBuscaGlobal() { fecharModal('modalBuscaGlobal'); }

function executarBuscaGlobal() {
    const termo = document.getElementById('buscaGlobalInput').value.toLowerCase().trim();
    const container = document.getElementById('buscaGlobalResultados');
    if (termo.length < 2) { container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Digite pelo menos 2 caracteres</p>'; return; }

    const resultados = [];

    carregarClientes().forEach(c => {
        if ((c.nome||'').toLowerCase().includes(termo) || (c.email||'').toLowerCase().includes(termo)) {
            resultados.push({ tipo: 'Cliente', icone: 'fa-user', nome: c.nome, sub: c.email, secao: 'clientes', cor: 'var(--accent)' });
        }
    });
    carregarProdutos().forEach(p => {
        if ((p.nome||'').toLowerCase().includes(termo) || (p.codigo||'').toLowerCase().includes(termo)) {
            resultados.push({ tipo: 'Produto', icone: 'fa-cubes', nome: p.nome, sub: `R$ ${Number(p.preco||0).toFixed(2)} · ${p.categoria||''}`, secao: 'produtos', cor: 'var(--success)' });
        }
    });
    carregarOS().forEach(os => {
        if ((os.titulo||'').toLowerCase().includes(termo) || (os.numero||'').toLowerCase().includes(termo)) {
            resultados.push({ tipo: 'O.S.', icone: 'fa-screwdriver-wrench', nome: os.titulo, sub: `#${os.numero} · ${os.cliente?.nome||''}`, secao: 'os', cor: 'var(--warning)' });
        }
    });
    carregarFornecedores().forEach(f => {
        if ((f.empresa||'').toLowerCase().includes(termo) || (f.contato||'').toLowerCase().includes(termo)) {
            resultados.push({ tipo: 'Fornecedor', icone: 'fa-truck', nome: f.empresa, sub: f.contato, secao: 'fornecedores', cor: 'var(--info)' });
        }
    });

    if (resultados.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhum resultado encontrado</p>';
        return;
    }

    container.innerHTML = resultados.map(r => html`
        <div class="busca-resultado" onclick="fecharBuscaGlobal(); mostrarSecao('${r.secao}')">
            <div class="busca-resultado-icon" style="color:${r.cor}"><i class="fa-solid ${r.icone}"></i></div>
            <div class="busca-resultado-info">
                <div class="busca-resultado-nome">${r.nome}</div>
                <div class="busca-resultado-sub"><span class="busca-resultado-tipo" style="color:${r.cor}">${r.tipo}</span> · ${r.sub}</div>
            </div>
        </div>
    `).join('');
}

// ─── NOTIFICAÇÕES SINO ─────────────────

async function calcularAlertas() {
    const alertas = [];
    const prods = await carregarProdutosDoBanco();
    const criticos = prods.filter(p => Number(p.estoque||0) <= Number(p.estoqueMin||0) && Number(p.estoqueMin||0) > 0);
    if (criticos.length > 0) alertas.push({ texto: `${criticos.length} produto(s) com estoque crítico`, icone: 'fa-warehouse', cor: 'var(--danger)', secao: 'estoque' });

    const hoje = new Date().toISOString().split('T')[0];
    const lancs = await carregarLancamentosDoBanco({ status: 'pendente' });
    const vencendo = lancs.filter(l => l.status === 'pendente' && l.data && String(l.data).split('T')[0] <= hoje);
    if (vencendo.length > 0) alertas.push({ texto: `${vencendo.length} lançamento(s) vencido(s)`, icone: 'fa-wallet', cor: 'var(--warning)', secao: 'financas' });

    const osList = await carregarOSDoBanco({ status: 'aberta' });
    const osAbertas = osList.filter(os => os.status === 'aberta');
    if (osAbertas.length > 0) alertas.push({ texto: `${osAbertas.length} O.S. em aberto`, icone: 'fa-screwdriver-wrench', cor: 'var(--accent)', secao: 'os' });

    return alertas;
}

async function renderizarAlertas() {
    const alertas = await calcularAlertas();
    const badge = document.getElementById('notifBadge');
    const lista = document.getElementById('notifLista');

    if (badge) {
        badge.textContent = alertas.length;
        badge.style.display = alertas.length > 0 ? 'flex' : 'none';
    }

    if (lista) {
        if (alertas.length === 0) {
            lista.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px"><i class="fa-solid fa-check-circle" style="color:var(--success);display:block;font-size:24px;margin-bottom:8px"></i>Nenhum alerta no momento</div>';
        } else {
            lista.innerHTML = alertas.map(a => html`
                <div class="notif-item" onclick="fecharNotif(); mostrarSecao('${a.secao}')">
                    <i class="fa-solid ${a.icone}" style="color:${a.cor}"></i>
                    <span>${a.texto}</span>
                </div>
            `).join('');
        }
    }
}

function toggleNotif() {
    const painel = document.getElementById('notifPainel');
    if (!painel) return;
    const aberto = painel.style.display === 'block';
    painel.style.display = aberto ? 'none' : 'block';
    if (!aberto) renderizarAlertas();
}

function fecharNotif() {
    const painel = document.getElementById('notifPainel');
    if (painel) painel.style.display = 'none';
}

document.addEventListener('click', e => {
    const painel = document.getElementById('notifPainel');
    const btn = document.getElementById('notifBtn');
    if (painel && btn && !painel.contains(e.target) && !btn.contains(e.target)) {
        painel.style.display = 'none';
    }
});

// ─── TOAST NOTIFICAÇÃO ─────────────────

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    const n = document.createElement('div');
    n.className = `toast toast-${tipo}`;
    n.innerHTML = html`<i class="fa-solid fa-${tipo === 'erro' ? 'circle-xmark' : 'circle-check'}"></i> ${mensagem}`;
    document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add('toast-show'));
    setTimeout(() => {
        n.classList.remove('toast-show');
        setTimeout(() => n.remove(), 400);
    }, 3000);
}

// ─── PAGINAÇÃO HELPER ──────────────────

function renderizarPaginacao(containerId, totalItens, itensPorPagina, paginaAtual, onMudar) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const totalPaginas = Math.ceil(totalItens / itensPorPagina);
    if (totalPaginas <= 1) { container.innerHTML = ''; return; }

    // Variável renomeada de `html` para `marcacao`: o nome antigo passou a
    // sombrear a função `html` de escape (js/seguranca.js), fazendo os
    // templates abaixo estourarem "html is not a function".
    let marcacao = '';
    marcacao += html`<button class="pag-btn" onclick="${onMudar}(${paginaAtual - 1})" ${paginaAtual <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;

    for (let i = 1; i <= totalPaginas; i++) {
        if (totalPaginas > 7) {
            if (i !== 1 && i !== totalPaginas && Math.abs(i - paginaAtual) > 2) {
                if (i === 2 || i === totalPaginas - 1) { marcacao += html`<span class="pag-ellipsis">…</span>`; }
                continue;
            }
        }
        marcacao += html`<button class="pag-btn ${i === paginaAtual ? 'pag-ativa' : ''}" onclick="${onMudar}(${i})">${i}</button>`;
    }

    marcacao += html`<button class="pag-btn" onclick="${onMudar}(${paginaAtual + 1})" ${paginaAtual >= totalPaginas ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
    container.innerHTML = marcacao;
}

// ─── EMPTY STATE ───────────────────────

function emptyState(mensagem, icone = 'fa-inbox', acao = '') {
    return html`
    <tr><td colspan="99" style="text-align:center;padding:40px 20px">
        <div style="color:var(--text-muted)">
            <i class="fa-solid ${icone}" style="font-size:32px;margin-bottom:12px;display:block;opacity:.4"></i>
            <p style="font-size:13px;margin:0 0 8px">${mensagem}</p>
            ${acao ? html`<p style="font-size:12px;color:var(--accent)">${acao}</p>` : ''}
        </div>
    </td></tr>`;
}

// ─── VALIDAÇÃO ─────────────────────────

function validarCampos(campos) {
    let valido = true;
    campos.forEach(({ id, nome }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const vazio = !el.value.trim();
        el.classList.toggle('campo-erro', vazio);
        if (vazio) {
            valido = false;
            // Remove a classe após corrigir
            el.addEventListener('input', () => el.classList.remove('campo-erro'), { once: true });
        }
    });
    if (!valido) mostrarNotificacao('Preencha todos os campos obrigatórios.', 'erro');
    return valido;
}

// ─── MÁSCARA TELEFONE ──────────────────

function mascaraTelefone(el) {
    let v = el.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    el.value = v;
}

function mascaraCPF(el) {
    let v = el.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 9) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`;
    else if (v.length > 6) v = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`;
    else if (v.length > 3) v = `${v.slice(0,3)}.${v.slice(3)}`;
    el.value = v;
}

// ─── ATUALIZAÇÃO GERAL ─────────────────

function atualizarTudo() {
    if (typeof atualizarDashboard === 'function') atualizarDashboard();
    renderizarAlertas();
}

// ─── INICIALIZAÇÃO ─────────────────────

document.addEventListener('DOMContentLoaded', () => {
    mostrarSecao('dashboard');
    renderizarAlertas();

    // Pré-carrega clientes e usuários: usados nos selects dos modais de
    // O.S. e Tarefas, que podem ser abertos antes de visitar essas seções.
    carregarClientesDoBanco();
    carregarUsuariosDoBanco();

    // Busca global com Ctrl+K
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            abrirBuscaGlobal();
        }
    });

    // Enter na busca global
    document.getElementById('buscaGlobalInput')?.addEventListener('input', executarBuscaGlobal);
});
