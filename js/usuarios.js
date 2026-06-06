// ======================================
// USUÁRIOS
// ======================================

let usuarios = [];

function renderizarUsuarios() {
    usuarios = carregarUsuarios();
    const tabela = document.getElementById('tabelaUsuarios');
    if (!tabela) return;

    const sessao = carregarSessao();
    const perfilCor = { Administrador: 'var(--danger)', Operador: 'var(--accent)', Visitante: 'var(--text-muted)' };

    if (usuarios.length === 0) {
        tabela.innerHTML = emptyState('Nenhum usuário cadastrado.', 'fa-user-shield');
        return;
    }

    tabela.innerHTML = usuarios.map(u => {
        const euMesmo = sessao && sessao.id === u.id;
        return `
        <tr>
            <td>${u.id}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div class="user-avatar-mini">${(u.nome||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}</div>
                    <div>
                        <strong>${u.nome}</strong>${euMesmo ? ' <span style="font-size:10px;color:var(--accent)">(você)</span>' : ''}
                    </div>
                </div>
            </td>
            <td><span style="font-family:monospace;font-size:12px">${u.usuario}</span></td>
            <td><span style="color:${perfilCor[u.perfil]||'var(--text-muted)'}"><i class="fa-solid fa-circle" style="font-size:8px;margin-right:4px"></i>${u.perfil}</span></td>
            <td>
                <button class="btn-icon" title="Editar" onclick="abrirModalUsuario(${u.id})"><i class="fa-solid fa-pen"></i></button>
                ${!euMesmo ? `<button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirUsuario(${u.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

function salvarUsuario() {
    const modal  = document.getElementById('modalUsuario');
    const editId = modal._editId;

    const nome   = document.getElementById('usuarioNome').value.trim();
    const login  = document.getElementById('usuarioUsername').value.trim();
    const senha  = document.getElementById('usuarioSenha').value.trim();
    const perfil = document.getElementById('usuarioPerfil').value;

    if (!nome || !login) { mostrarNotificacao('Nome e usuário são obrigatórios.', 'erro'); return; }
    if (!editId && !senha) { mostrarNotificacao('Informe uma senha.', 'erro'); return; }

    usuarios = carregarUsuarios();

    const duplicado = usuarios.find(u => u.usuario === login && u.id !== editId);
    if (duplicado) { mostrarNotificacao('Já existe um usuário com este login.', 'erro'); return; }

    if (editId !== null && editId !== undefined) {
        const u = usuarios.find(x => x.id === editId);
        if (u) {
            u.nome   = nome;
            u.usuario = login;
            u.perfil = perfil;
            if (senha) u.senha = senha;
        }
        registrarLog('Editar', 'Usuários', nome);
    } else {
        usuarios.push({ id: _nextId(usuarios), nome, usuario: login, senha, perfil });
        registrarLog('Criar', 'Usuários', nome);
    }

    salvarUsuarios();
    fecharModalUsuario();
    renderizarUsuarios();
    mostrarNotificacao(editId ? 'Usuário atualizado!' : 'Usuário criado!');
}

function excluirUsuario(id) {
    const u = usuarios.find(x => x.id === id);
    abrirConfirmacao(`Excluir o usuário "${u?.nome}"?`, () => {
        usuarios = usuarios.filter(x => x.id !== id);
        salvarUsuarios();
        renderizarUsuarios();
        registrarLog('Excluir', 'Usuários', u?.nome);
        mostrarNotificacao('Usuário excluído.');
    }, 'Excluir usuário');
}

// ─── PERFIL PESSOAL ────────────────────

function salvarPerfil() {
    const nome     = document.getElementById('perfilNome').value.trim();
    const senhaAtual = document.getElementById('perfilSenhaAtual').value.trim();
    const novaSenha  = document.getElementById('perfilNovaSenha').value.trim();

    if (!nome) { mostrarNotificacao('Informe seu nome.', 'erro'); return; }

    const sessao = carregarSessao();
    if (!sessao) return;

    usuarios = carregarUsuarios();
    const u = usuarios.find(x => x.id === sessao.id);
    if (!u) return;

    if (novaSenha) {
        if (senhaAtual !== u.senha) { mostrarNotificacao('Senha atual incorreta.', 'erro'); return; }
        u.senha = novaSenha;
    }
    u.nome = nome;

    salvarUsuarios();
    salvarSessao({ ...sessao, nome });
    document.getElementById('usuarioLogado').textContent = nome;
    const iniciais = document.getElementById('userIniciais');
    if (iniciais) iniciais.textContent = nome.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();

    fecharModalPerfil();
    mostrarNotificacao('Perfil atualizado!');
}

document.addEventListener('DOMContentLoaded', () => { usuarios = carregarUsuarios(); });
