// ======================================
// CAMADA DE DADOS — API REST (PAINEL ADMINISTRATIVO)
// ======================================
// Histórico: esta camada substitui a versão anterior que guardava tudo
// em localStorage. Hoje, o localStorage é usado apenas para:
//   - sessão do usuário logado (token JWT + dados básicos)
//   - tema (dark/light)
//   - log de ações é gravado pelo próprio backend
// Todo o resto (clientes, produtos, pedidos, O.S., estoque, finanças,
// agenda, tarefas, notas, usuários) vem e volta sempre da API.
//
// Cada módulo mantém uma "cache" local em memória (ex.: `clientes`,
// `produtos`) só para permitir filtros/paginação síncronos depois que
// os dados já chegaram — nunca é a fonte de verdade.

const STORAGE_KEYS = {
    TEMA:   'erp_tema',
    SESSAO: 'erp_sessao'
};

// Ajuste aqui se o backend estiver rodando em outro host/porta.
const API_BASE_URL = window.__API_BASE_URL__ || 'http://localhost:3001/api';

// ─── PÁGINA ATUAL ────────────────────────────────────────
// Devolve o nome da página sem a extensão: 'login', 'index', 'loja'...
//
// Comparar direto com 'login.html' quebraria dependendo de como o host
// serve os arquivos: com "clean URLs" ativado (Vercel, Netlify), o
// caminho vira '/login' e a comparação falha — a tela de login passaria
// a se redirecionar para si mesma, em loop infinito. Normalizar aqui
// deixa o resto do código indiferente a essa configuração.
function paginaAtual() {
    const ultimo = window.location.pathname.split('/').pop() || 'index';
    return ultimo.replace(/\.html$/, '');
}

// ─── HELPERS DE STORAGE (sessão e tema apenas) ──────────

function _get(key)      { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── SESSÃO (equipe interna) ────────────────────────────

function carregarSessao()  { return _get(STORAGE_KEYS.SESSAO); }
function salvarSessao(u)   { _set(STORAGE_KEYS.SESSAO, u); }
function limparSessao()    { localStorage.removeItem(STORAGE_KEYS.SESSAO); }

// ─── TEMA ────────────────────────────────────────────────

function carregarTema()    { return localStorage.getItem(STORAGE_KEYS.TEMA) || 'dark'; }
function salvarTema(t)     { localStorage.setItem(STORAGE_KEYS.TEMA, t); }

// ─── CLIENTE HTTP GENÉRICO ──────────────────────────────

function getAuthToken() {
    return carregarSessao()?.token || null;
}

function getApiHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    const token = getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

async function apiRequest(path, options = {}) {
    let resposta;
    try {
        resposta = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                ...getApiHeaders(),
                ...(options.headers || {})
            }
        });
    } catch (erroRede) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }

    // Sessão expirada/inválida: desloga automaticamente (exceto na tela de
    // login — senão a própria tela de login entraria em loop de redirect).
    if (resposta.status === 401) {
        limparSessao();
        if (paginaAtual() !== 'login') {
            window.location.href = 'login.html';
        }
    }

    const texto = await resposta.text();
    let dados = null;
    if (texto) {
        try { dados = JSON.parse(texto); } catch { dados = texto; }
    }

    if (!resposta.ok) {
        const mensagem = dados?.erro || dados?.detalhes?.[0]?.mensagem || dados?.message || 'Erro ao comunicar com o backend.';
        const erro = new Error(mensagem);
        erro.status = resposta.status;
        erro.detalhes = dados?.detalhes;
        throw erro;
    }

    return dados;
}

function qs(params = {}) {
    const limpa = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const str = new URLSearchParams(limpa).toString();
    return str ? `?${str}` : '';
}

// ─── CRUD GENÉRICO (usado pelos módulos abaixo) ─────────
// Cada recurso REST do painel segue o mesmo padrão:
//   GET /recurso?busca=&pagina=&porPagina=  -> { itens, paginacao }
//   GET /recurso/:id
//   POST /recurso
//   PUT /recurso/:id
//   DELETE /recurso/:id

function criarRecursoApi(caminho) {
    return {
        async listar(params = {}) {
            const dados = await apiRequest(`${caminho}${qs(params)}`);
            return Array.isArray(dados) ? { itens: dados, paginacao: null } : (dados || { itens: [], paginacao: null });
        },
        // O backend limita porPagina a 100 por requisição (proteção
        // contra respostas gigantes). Para telas que ainda paginam no
        // próprio navegador (e por isso precisam da lista completa) ou
        // para exportações em CSV, buscamos todas as páginas em série.
        async listarTodos(params = {}) {
            const primeira = await this.listar({ ...params, pagina: 1, porPagina: 100 });
            let itens = primeira.itens;
            const totalPaginas = primeira.paginacao?.totalPaginas || 1;
            for (let p = 2; p <= totalPaginas; p++) {
                const pagina = await this.listar({ ...params, pagina: p, porPagina: 100 });
                itens = itens.concat(pagina.itens);
            }
            return itens;
        },
        async obter(id) {
            return apiRequest(`${caminho}/${id}`);
        },
        async criar(dados) {
            return apiRequest(caminho, { method: 'POST', body: JSON.stringify(dados) });
        },
        async atualizar(id, dados) {
            return apiRequest(`${caminho}/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
        },
        async excluir(id) {
            return apiRequest(`${caminho}/${id}`, { method: 'DELETE' });
        }
    };
}

const recursoClientes     = criarRecursoApi('/clientes');
const recursoFornecedores = criarRecursoApi('/fornecedores');
const recursoProdutos     = criarRecursoApi('/produtos');
const recursoOS           = criarRecursoApi('/os');
const recursoLancamentos  = criarRecursoApi('/financas/lancamentos');
const recursoAgenda       = criarRecursoApi('/agenda');
const recursoTarefas      = criarRecursoApi('/tarefas');
const recursoNotas        = criarRecursoApi('/notas');
const recursoUsuarios     = criarRecursoApi('/usuarios');

// ======================================
// CLIENTES
// ======================================
let clientesCache = [];
function setClientesCache(val) { clientesCache = Array.isArray(val) ? val : []; }
function carregarClientes() { return clientesCache; }

async function carregarClientesDoBanco(params = {}) {
    try {
        const itens = await recursoClientes.listarTodos(params);
        setClientesCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar clientes do backend:', erro.message);
        return clientesCache;
    }
}

async function salvarClienteNoBanco(dados, id = null) {
    const cliente = (id !== null && id !== undefined)
        ? await recursoClientes.atualizar(id, dados)
        : await recursoClientes.criar(dados);
    await carregarClientesDoBanco();
    return cliente;
}

async function excluirClienteNoBanco(id) {
    await recursoClientes.excluir(id);
    await carregarClientesDoBanco();
}

// ======================================
// FORNECEDORES
// ======================================
let fornecedoresCache = [];
function setFornecedoresCache(val) { fornecedoresCache = Array.isArray(val) ? val : []; }
function carregarFornecedores() { return fornecedoresCache; }

async function carregarFornecedoresDoBanco(params = {}) {
    try {
        const itens = await recursoFornecedores.listarTodos(params);
        setFornecedoresCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar fornecedores do backend:', erro.message);
        return fornecedoresCache;
    }
}

async function salvarFornecedorNoBanco(dados, id = null) {
    const fornecedor = (id !== null && id !== undefined)
        ? await recursoFornecedores.atualizar(id, dados)
        : await recursoFornecedores.criar(dados);
    await carregarFornecedoresDoBanco();
    return fornecedor;
}

async function excluirFornecedorNoBanco(id) {
    await recursoFornecedores.excluir(id);
    await carregarFornecedoresDoBanco();
}

// ======================================
// PRODUTOS
// ======================================
let produtosCache = [];
function setProdutosCache(val) { produtosCache = Array.isArray(val) ? val : []; }
function carregarProdutos() { return produtosCache; }

async function carregarProdutosDoBanco(params = {}) {
    try {
        const itens = await recursoProdutos.listarTodos(params);
        setProdutosCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar produtos do backend:', erro.message);
        return produtosCache;
    }
}

async function salvarProdutoNoBanco(dados, id = null) {
    const produto = (id !== null && id !== undefined)
        ? await recursoProdutos.atualizar(id, dados)
        : await recursoProdutos.criar(dados);
    await carregarProdutosDoBanco();
    return produto;
}

async function excluirProdutoNoBanco(id) {
    await recursoProdutos.excluir(id);
    await carregarProdutosDoBanco();
}

// ======================================
// ORDENS DE SERVIÇO
// ======================================
let ordensServicoCache = [];
function setOSCache(val) { ordensServicoCache = Array.isArray(val) ? val : []; }
function carregarOS() { return ordensServicoCache; }

async function carregarOSDoBanco(params = {}) {
    try {
        const itens = await recursoOS.listarTodos(params);
        setOSCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar O.S. do backend:', erro.message);
        return ordensServicoCache;
    }
}

async function salvarOSNoBanco(dados, id = null) {
    const os = (id !== null && id !== undefined)
        ? await recursoOS.atualizar(id, dados)
        : await recursoOS.criar(dados);
    await carregarOSDoBanco();
    return os;
}

async function alterarStatusOSNoBanco(id, status) {
    const os = await apiRequest(`/os/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await carregarOSDoBanco();
    return os;
}

async function excluirOSNoBanco(id) {
    await recursoOS.excluir(id);
    await carregarOSDoBanco();
}

// ======================================
// ESTOQUE (movimentos)
// ======================================
let movimentosCache = [];
function setMovimentosCache(val) { movimentosCache = Array.isArray(val) ? val : []; }
function carregarMovimentos() { return movimentosCache; }

async function carregarMovimentosDoBanco(params = {}) {
    try {
        // Diferente de produtos/clientes/O.S., o histórico de movimentos só
        // cresce com o tempo — então aqui mantemos a paginação real do
        // servidor (sempre os 100 mais recentes, ou a página pedida via
        // params.pagina) em vez de buscar tudo de uma vez.
        const dados = await apiRequest(`/estoque/movimentos${qs({ pagina: 1, porPagina: 100, ...params })}`);
        const itens = dados?.itens || [];
        setMovimentosCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar movimentos do backend:', erro.message);
        return movimentosCache;
    }
}

async function criarMovimentoNoBanco(dados) {
    const movimento = await apiRequest('/estoque/movimentos', { method: 'POST', body: JSON.stringify(dados) });
    await Promise.all([carregarMovimentosDoBanco(), carregarProdutosDoBanco()]);
    return movimento;
}

async function carregarResumoEstoqueDoBanco() {
    try {
        return await apiRequest('/estoque/resumo');
    } catch (erro) {
        console.warn('Não foi possível carregar resumo de estoque:', erro.message);
        return { totalProdutos: 0, valorTotalEstoque: 0, criticos: 0, zerados: 0 };
    }
}

// ======================================
// FINANÇAS (lançamentos)
// ======================================
let lancamentosCache = [];
function setLancamentosCache(val) { lancamentosCache = Array.isArray(val) ? val : []; }
function carregarLancamentos() { return lancamentosCache; }

async function carregarLancamentosDoBanco(params = {}) {
    try {
        const itens = await recursoLancamentos.listarTodos(params);
        setLancamentosCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar lançamentos do backend:', erro.message);
        return lancamentosCache;
    }
}

async function salvarLancamentoNoBanco(dados, id = null) {
    const lancamento = (id !== null && id !== undefined)
        ? await recursoLancamentos.atualizar(id, dados)
        : await recursoLancamentos.criar(dados);
    await carregarLancamentosDoBanco();
    return lancamento;
}

async function excluirLancamentoNoBanco(id) {
    await recursoLancamentos.excluir(id);
    await carregarLancamentosDoBanco();
}

async function carregarResumoFinancasDoBanco(params = {}) {
    try {
        return await apiRequest(`/financas/resumo${qs(params)}`);
    } catch (erro) {
        console.warn('Não foi possível carregar resumo financeiro:', erro.message);
        return { receita: 0, despesa: 0, saldo: 0, pendentes: 0 };
    }
}

// ======================================
// AGENDA (eventos)
// ======================================
let eventosCache = [];
function setEventosCache(val) { eventosCache = Array.isArray(val) ? val : []; }
function carregarEventos() { return eventosCache; }

async function carregarEventosDoBanco(params = {}) {
    try {
        const dados = await apiRequest(`/agenda${qs(params)}`);
        const itens = Array.isArray(dados) ? dados : [];
        setEventosCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar eventos do backend:', erro.message);
        return eventosCache;
    }
}

async function salvarEventoNoBanco(dados, id = null) {
    const evento = (id !== null && id !== undefined)
        ? await recursoAgenda.atualizar(id, dados)
        : await recursoAgenda.criar(dados);
    await carregarEventosDoBanco();
    return evento;
}

async function excluirEventoNoBanco(id) {
    await recursoAgenda.excluir(id);
    await carregarEventosDoBanco();
}

// ======================================
// TAREFAS (kanban)
// ======================================
let tarefasCache = [];
function setTarefasCache(val) { tarefasCache = Array.isArray(val) ? val : []; }
function carregarTarefas() { return tarefasCache; }

async function carregarTarefasDoBanco() {
    try {
        const dados = await apiRequest('/tarefas');
        const itens = Array.isArray(dados) ? dados : [];
        setTarefasCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar tarefas do backend:', erro.message);
        return tarefasCache;
    }
}

async function salvarTarefaNoBanco(dados, id = null) {
    const tarefa = (id !== null && id !== undefined)
        ? await recursoTarefas.atualizar(id, dados)
        : await recursoTarefas.criar(dados);
    await carregarTarefasDoBanco();
    return tarefa;
}

async function alterarStatusTarefaNoBanco(id, status) {
    const tarefa = await apiRequest(`/tarefas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await carregarTarefasDoBanco();
    return tarefa;
}

async function excluirTarefaNoBanco(id) {
    await recursoTarefas.excluir(id);
    await carregarTarefasDoBanco();
}

// ======================================
// NOTAS
// ======================================
let notasCache = [];
function setNotasCache(val) { notasCache = Array.isArray(val) ? val : []; }
function carregarNotas() { return notasCache; }

async function carregarNotasDoBanco() {
    try {
        const dados = await apiRequest('/notas');
        const itens = Array.isArray(dados) ? dados : [];
        setNotasCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar notas do backend:', erro.message);
        return notasCache;
    }
}

async function salvarNotaNoBanco(dados, id = null) {
    const nota = (id !== null && id !== undefined)
        ? await recursoNotas.atualizar(id, dados)
        : await recursoNotas.criar(dados);
    await carregarNotasDoBanco();
    return nota;
}

async function excluirNotaNoBanco(id) {
    await recursoNotas.excluir(id);
    await carregarNotasDoBanco();
}

// ======================================
// USUÁRIOS DO SISTEMA
// ======================================
let usuariosCache = [];
function setUsuariosCache(val) { usuariosCache = Array.isArray(val) ? val : []; }
function carregarUsuarios() { return usuariosCache; }

async function carregarUsuariosDoBanco() {
    try {
        const dados = await apiRequest('/usuarios');
        const itens = Array.isArray(dados) ? dados : [];
        setUsuariosCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar usuários do backend:', erro.message);
        return usuariosCache;
    }
}

async function salvarUsuarioNoBanco(dados, id = null) {
    const usuario = (id !== null && id !== undefined)
        ? await recursoUsuarios.atualizar(id, dados)
        : await recursoUsuarios.criar(dados);
    await carregarUsuariosDoBanco();
    return usuario;
}

async function excluirUsuarioNoBanco(id) {
    await recursoUsuarios.excluir(id);
    await carregarUsuariosDoBanco();
}

// ======================================
// PEDIDOS (painel — vindos da loja)
// ======================================
let pedidosCache = [];
function setPedidosCache(val) { pedidosCache = Array.isArray(val) ? val : []; }
function carregarPedidos() { return pedidosCache; }

async function carregarPedidosDoBanco(params = {}) {
    try {
        // Assim como o histórico de movimentos de estoque, pedidos só
        // crescem com o tempo — mantemos a paginação real do servidor
        // (a tela de Pedidos já pagina visualmente por cima disso).
        const dados = await apiRequest(`/pedidos${qs({ pagina: 1, porPagina: 100, ...params })}`);
        const itens = dados?.itens || [];
        setPedidosCache(itens);
        return itens;
    } catch (erro) {
        console.warn('Não foi possível carregar pedidos do backend:', erro.message);
        return pedidosCache;
    }
}

async function carregarResumoPedidosDoBanco() {
    try {
        return await apiRequest('/pedidos/resumo');
    } catch (erro) {
        console.warn('Não foi possível carregar resumo de pedidos:', erro.message);
        return { pendentes: 0, processando: 0, enviados: 0, faturado: 0 };
    }
}

async function obterPedidoDoBanco(id) {
    return apiRequest(`/pedidos/${id}`);
}

async function alterarStatusPedidoNoBanco(id, status) {
    const pedido = await apiRequest(`/pedidos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await carregarPedidosDoBanco();
    return pedido;
}

async function excluirPedidoNoBanco(id) {
    await apiRequest(`/pedidos/${id}`, { method: 'DELETE' });
    await carregarPedidosDoBanco();
}

// ======================================
// DASHBOARD E RELATÓRIOS
// ======================================

async function carregarDashboardDoBanco() {
    return apiRequest('/dashboard');
}

async function carregarRelatorio(caminho, params = {}) {
    return apiRequest(`/relatorios/${caminho}${qs(params)}`);
}

// ======================================
// BACKUP
// ======================================

async function exportarDadosDoBanco() {
    const backup = await apiRequest('/backup');
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-gestaopro-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importarDados(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = async function (e) {
        try {
            const conteudo = JSON.parse(e.target.result);
            await apiRequest('/backup/importar', { method: 'POST', body: JSON.stringify(conteudo) });
            mostrarNotificacao('Backup importado com sucesso!');
            setTimeout(() => location.reload(), 1200);
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Arquivo de backup inválido.', 'erro');
        }
    };
    leitor.readAsText(arquivo);
}

// ─── LOG DE AÇÕES ────────────────────────────────────────
// O backend já registra logs automaticamente em cada operação de
// escrita relevante (ver services/log.service.js). Esta função fica
// como um stub inofensivo para não quebrar chamadas antigas que ainda
// não foram removidas de algum trecho do front-end.
function registrarLog() { /* o backend já registra o log desta ação */ }

// ─── INICIALIZAÇÃO ──────────────────────────────────────

function inicializarStorage() {
    const tema = carregarTema();
    if (tema === 'light') document.body.classList.add('light-theme');
}
