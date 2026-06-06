// ======================================
// SISTEMA DE GESTÃO V6
// LOCAL STORAGE - CAMADA DE DADOS
// Preparado para substituição por API REST
// ======================================

const STORAGE_KEYS = {
    CLIENTES:    'erp_clientes',
    PRODUTOS:    'erp_produtos',
    PEDIDOS:     'erp_pedidos',
    OS:          'erp_os',
    USUARIOS:    'erp_usuarios',
    TEMA:        'erp_tema',
    SESSAO:      'erp_sessao',
    FORNECEDORES:'erp_fornecedores',
    LANCAMENTOS: 'erp_lancamentos',
    EVENTOS:     'erp_eventos',
    TAREFAS:     'erp_tarefas',
    NOTAS:       'erp_notas',
    MOVIMENTOS:  'erp_movimentos',
    LOG:         'erp_log'
};

// ─── HELPERS ───────────────────────────

function _get(key)       { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function _set(key, val)  { localStorage.setItem(key, JSON.stringify(val)); }
function _nextId(arr)    { return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

// ─── CLIENTES ──────────────────────────

function carregarClientes()       { return _get(STORAGE_KEYS.CLIENTES) || []; }
function salvarClientes()         { _set(STORAGE_KEYS.CLIENTES, clientes); }

// ─── PRODUTOS ──────────────────────────

function carregarProdutos()       { return _get(STORAGE_KEYS.PRODUTOS) || []; }
function salvarProdutos()         { _set(STORAGE_KEYS.PRODUTOS, produtos); }

// ─── PEDIDOS ───────────────────────────

function carregarPedidos()        { return _get(STORAGE_KEYS.PEDIDOS) || []; }
function salvarPedidos()          { _set(STORAGE_KEYS.PEDIDOS, pedidos); }

// ─── ORDENS DE SERVIÇO ─────────────────

function carregarOS()             { return _get(STORAGE_KEYS.OS) || []; }
function salvarOS()               { _set(STORAGE_KEYS.OS, ordensServico); }

// ─── USUÁRIOS ──────────────────────────

function carregarUsuarios()       { return _get(STORAGE_KEYS.USUARIOS) || []; }
function salvarUsuarios()         { _set(STORAGE_KEYS.USUARIOS, usuarios); }

// ─── FORNECEDORES ──────────────────────

function carregarFornecedores()   { return _get(STORAGE_KEYS.FORNECEDORES) || []; }
function salvarFornecedoresList() { _set(STORAGE_KEYS.FORNECEDORES, fornecedores); }

// ─── LANÇAMENTOS ───────────────────────

function carregarLancamentos()    { return _get(STORAGE_KEYS.LANCAMENTOS) || []; }
function salvarLancamentosList()  { _set(STORAGE_KEYS.LANCAMENTOS, lancamentos); }

// ─── EVENTOS ───────────────────────────

function carregarEventos()        { return _get(STORAGE_KEYS.EVENTOS) || []; }
function salvarEventosList()      { _set(STORAGE_KEYS.EVENTOS, eventos); }

// ─── TAREFAS ───────────────────────────

function carregarTarefas()        { return _get(STORAGE_KEYS.TAREFAS) || []; }
function salvarTarefasList()      { _set(STORAGE_KEYS.TAREFAS, tarefas); }

// ─── NOTAS ─────────────────────────────

function carregarNotas()          { return _get(STORAGE_KEYS.NOTAS) || []; }
function salvarNotasList()        { _set(STORAGE_KEYS.NOTAS, notas); }

// ─── MOVIMENTOS ────────────────────────

function carregarMovimentos()     { return _get(STORAGE_KEYS.MOVIMENTOS) || []; }
function salvarMovimentos()       { _set(STORAGE_KEYS.MOVIMENTOS, movimentos); }

// ─── SESSÃO ────────────────────────────

function carregarSessao()  { return _get(STORAGE_KEYS.SESSAO); }
function salvarSessao(u)   { _set(STORAGE_KEYS.SESSAO, u); }
function limparSessao()    { localStorage.removeItem(STORAGE_KEYS.SESSAO); }

// ─── TEMA ──────────────────────────────

function carregarTema()    { return localStorage.getItem(STORAGE_KEYS.TEMA) || 'dark'; }
function salvarTema(t)     { localStorage.setItem(STORAGE_KEYS.TEMA, t); }

// ─── LOG DE AÇÕES ──────────────────────

function registrarLog(acao, modulo, detalhe = '') {
    const log = _get(STORAGE_KEYS.LOG) || [];
    const sessao = carregarSessao();
    log.unshift({
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        usuario: sessao ? sessao.nome : 'Sistema',
        acao, modulo, detalhe
    });
    // Manter apenas os 200 últimos
    _set(STORAGE_KEYS.LOG, log.slice(0, 200));
}

function carregarLog() { return _get(STORAGE_KEYS.LOG) || []; }

// ─── BACKUP / IMPORTAR ─────────────────

function exportarDados() {
    const backup = {
        versao: '6.0',
        data: new Date().toISOString(),
        clientes: carregarClientes(),
        produtos: carregarProdutos(),
        pedidos: carregarPedidos(),
        os: carregarOS(),
        usuarios: carregarUsuarios(),
        fornecedores: carregarFornecedores(),
        lancamentos: carregarLancamentos(),
        eventos: carregarEventos(),
        tarefas: carregarTarefas(),
        notas: carregarNotas(),
        movimentos: carregarMovimentos()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-erp-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao('Backup exportado com sucesso!');
}

function importarDados(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.clientes)     _set(STORAGE_KEYS.CLIENTES,     dados.clientes);
            if (dados.produtos)     _set(STORAGE_KEYS.PRODUTOS,      dados.produtos);
            if (dados.pedidos)      _set(STORAGE_KEYS.PEDIDOS,       dados.pedidos);
            if (dados.os)           _set(STORAGE_KEYS.OS,            dados.os);
            if (dados.usuarios)     _set(STORAGE_KEYS.USUARIOS,      dados.usuarios);
            if (dados.fornecedores) _set(STORAGE_KEYS.FORNECEDORES,  dados.fornecedores);
            if (dados.lancamentos)  _set(STORAGE_KEYS.LANCAMENTOS,   dados.lancamentos);
            if (dados.eventos)      _set(STORAGE_KEYS.EVENTOS,       dados.eventos);
            if (dados.tarefas)      _set(STORAGE_KEYS.TAREFAS,       dados.tarefas);
            if (dados.notas)        _set(STORAGE_KEYS.NOTAS,         dados.notas);
            if (dados.movimentos)   _set(STORAGE_KEYS.MOVIMENTOS,    dados.movimentos);
            mostrarNotificacao('Backup importado com sucesso!');
            setTimeout(() => location.reload(), 1500);
        } catch {
            mostrarNotificacao('Arquivo de backup inválido.', 'erro');
        }
    };
    leitor.readAsText(arquivo);
}

// ─── INICIALIZAÇÃO ─────────────────────

function inicializarStorage() {
    const tema = carregarTema();
    if (tema === 'light') document.body.classList.add('light-theme');
}
