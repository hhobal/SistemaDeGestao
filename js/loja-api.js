// ======================================
// CAMADA DE DADOS — LOJA VIRTUAL (cliente final)
// ======================================
// Importante: a loja usa autenticação separada do painel administrativo
// (token de cliente, não o token de usuário/equipe — ver backend
// middleware/auth.js: autenticarCliente x autenticar). Por isso esta
// camada guarda a sessão em chaves de localStorage próprias
// ('loja_token' / 'loja_cliente'), nunca reaproveitando 'erp_sessao'.

const LOJA_API_BASE_URL = window.__API_BASE_URL__ || 'http://localhost:3000/api';

const LOJA_STORAGE_KEYS = {
    TOKEN:   'loja_token',
    CLIENTE: 'loja_cliente',
    CARRINHO: 'loja_carrinho' // o carrinho em si é local até o checkout; não há "carrinho" no backend
};

function lojaGet(key)      { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function lojaSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── SESSÃO DO CLIENTE ──────────────────

function lojaCarregarToken()   { return localStorage.getItem(LOJA_STORAGE_KEYS.TOKEN); }
function lojaCarregarCliente() { return lojaGet(LOJA_STORAGE_KEYS.CLIENTE); }

function lojaSalvarSessao(token, cliente) {
    localStorage.setItem(LOJA_STORAGE_KEYS.TOKEN, token);
    lojaSet(LOJA_STORAGE_KEYS.CLIENTE, cliente);
}

function lojaLimparSessao() {
    localStorage.removeItem(LOJA_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(LOJA_STORAGE_KEYS.CLIENTE);
}

function lojaClienteLogado() {
    return !!lojaCarregarToken();
}

// ─── CARRINHO (continua local até o checkout) ──────────

function lojaCarregarCarrinho()    { return lojaGet(LOJA_STORAGE_KEYS.CARRINHO) || []; }
function lojaSalvarCarrinho(itens) { lojaSet(LOJA_STORAGE_KEYS.CARRINHO, itens); }
function lojaLimparCarrinho()      { localStorage.removeItem(LOJA_STORAGE_KEYS.CARRINHO); }

// ─── CLIENTE HTTP ───────────────────────

async function lojaApiRequest(path, options = {}) {
    const token = lojaCarregarToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    let resposta;
    try {
        resposta = await fetch(`${LOJA_API_BASE_URL}${path}`, { ...options, headers });
    } catch {
        throw new Error('Não foi possível conectar à loja. Verifique sua conexão ou se o servidor está rodando.');
    }

    if (resposta.status === 401 && path !== '/loja/auth/login') {
        lojaLimparSessao();
    }

    const texto = await resposta.text();
    let dados = null;
    if (texto) { try { dados = JSON.parse(texto); } catch { dados = texto; } }

    if (!resposta.ok) {
        const mensagem = dados?.erro || dados?.detalhes?.[0]?.mensagem || 'Erro ao comunicar com a loja.';
        const erro = new Error(mensagem);
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

function lojaQs(params = {}) {
    const limpa = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const str = new URLSearchParams(limpa).toString();
    return str ? `?${str}` : '';
}

// ─── CATÁLOGO (público) ─────────────────

async function lojaCarregarProdutos(params = {}) {
    return lojaApiRequest(`/loja/produtos${lojaQs(params)}`);
}

async function lojaCarregarCategorias() {
    return lojaApiRequest('/loja/produtos/categorias');
}

// ─── CONTA ───────────────────────────────

async function lojaRegistrar(dados) {
    const resp = await lojaApiRequest('/loja/auth/registrar', { method: 'POST', body: JSON.stringify(dados) });
    lojaSalvarSessao(resp.token, resp.cliente);
    return resp.cliente;
}

async function lojaLogin(email, senha) {
    const resp = await lojaApiRequest('/loja/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
    lojaSalvarSessao(resp.token, resp.cliente);
    return resp.cliente;
}

async function lojaCarregarPerfil() {
    const cliente = await lojaApiRequest('/loja/auth/me');
    lojaSet(LOJA_STORAGE_KEYS.CLIENTE, cliente);
    return cliente;
}

function lojaLogout() {
    lojaLimparSessao();
}

// ─── PEDIDOS ─────────────────────────────

async function lojaCriarPedido(dados) {
    return lojaApiRequest('/loja/pedidos', { method: 'POST', body: JSON.stringify(dados) });
}

async function lojaMeusPedidos() {
    return lojaApiRequest('/loja/pedidos');
}
