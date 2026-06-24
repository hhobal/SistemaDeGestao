// ======================================
// LOGIN / SESSÃO / PERMISSÕES
// ======================================

// ─── LOGIN ─────────────────────────────

async function login() {
    const u = document.getElementById('usuario')?.value.trim();
    const s = document.getElementById('senha')?.value.trim();
    if (!u || !s) { mostrarErroLogin('Preencha usuário e senha.'); return; }

    try {
        const dados = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ usuario: u, senha: s })
        });

        const sessao = { ...dados.usuario, token: dados.token };
        salvarSessao(sessao);
        registrarLog('Login', 'Sistema', 'Acesso via login');
        window.location.href = 'index.html';
    } catch (erro) {
        mostrarErroLogin(erro.message || 'Usuário ou senha inválidos.');
        document.getElementById('senha').value = '';
        document.getElementById('senha').focus();
    }
}

function mostrarErroLogin(msg) {
    const el = document.getElementById('loginErro');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    else alert(msg);
}

// ─── LOGOUT ────────────────────────────

function logout() {
    abrirConfirmacao('Deseja realmente sair do sistema?', async () => {
        try {
            const token = getAuthToken();
            if (token) {
                await apiRequest('/auth/logout', { method: 'POST' });
            }
        } catch (erro) {
            console.warn('Falha ao encerrar sessão no backend:', erro.message);
        }

        registrarLog('Logout', 'Sistema');
        limparSessao();
        window.location.href = 'login.html';
    });
}

// ─── VERIFICAR SESSÃO ──────────────────

function verificarSessao() {
    const pagina = window.location.pathname.split('/').pop();
    const sessao = carregarSessao();

    if (pagina === 'login.html') {
        if (sessao) window.location.href = 'index.html';
        return;
    }
    if (!sessao) { window.location.href = 'login.html'; return; }
}

// ─── EXIBIR USUÁRIO ────────────────────

function exibirUsuarioLogado() {
    const sessao = carregarSessao();
    if (!sessao) return;

    const nome  = document.getElementById('usuarioLogado');
    const nivel = document.getElementById('nivelUsuario');
    const iniciais = document.getElementById('userIniciais');

    if (nome)  nome.textContent  = sessao.nome;
    if (nivel) nivel.textContent = sessao.perfil;
    if (iniciais) iniciais.textContent = sessao.nome.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
}

// ─── PERMISSÕES ────────────────────────

function getPerfil() {
    return carregarSessao()?.perfil || 'Visitante';
}

function isAdmin()    { return getPerfil() === 'Administrador'; }
function isOperador() { return getPerfil() === 'Operador'; }

function aplicarPermissoes() {
    const perfil = getPerfil();

    // Visitante: esconde ações de criação/exclusão (exceto botões dentro de modais de sistema)
    if (perfil === 'Visitante') {
        document.querySelectorAll('.btn-primary, .btn-danger').forEach(b => {
            if (!b.closest('#modalConfirm') && !b.closest('#modalPerfil')) {
                b.style.display = 'none';
            }
        });
    }

    // Operador e Visitante: esconde menu de usuários
    if (perfil !== 'Administrador') {
        document.querySelectorAll('[data-secao="usuarios"]').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// ─── ENTER NO LOGIN ────────────────────

function configurarEnterLogin() {
    document.getElementById('senha')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') login();
    });
    document.getElementById('usuario')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('senha')?.focus();
    });
}

// ─── INICIALIZAÇÃO ─────────────────────

document.addEventListener('DOMContentLoaded', () => {
    verificarSessao();
    exibirUsuarioLogado();
    configurarEnterLogin();
    setTimeout(aplicarPermissoes, 100);
});
