// ======================================
// USUÁRIOS DO SISTEMA
// ======================================

let usuarios = [];

async function renderizarUsuarios() {
    usuarios = await carregarUsuariosDoBanco();
    _desenharTabelaUsuarios();
}

function _desenharTabelaUsuarios() {
    const tabela = document.getElementById('tabelaUsuarios');
    if (!tabela) return;

    const sessao = carregarSessao();
    const perfilCor = { Administrador: 'var(--danger)', Operador: 'var(--accent)', Visitante: 'var(--text-muted)' };

    if (usuarios.length === 0) {
        tabela.innerHTML = emptyState('Nenhum usuário cadastrado.', 'fa-user-shield');
        return;
    }

    tabela.innerHTML = usuarios.map(u => {
        const euMesmo = sessao && String(sessao.id) === String(u.id);
        return html`
        <tr>
            <td>${u.id}</td>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div class="user-avatar-mini">${(u.nome||'?').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}</div>
                    <div>
                        <strong>${u.nome}</strong>${euMesmo ? ' <span style="font-size:10px;color:var(--accent)">(você)</span>' : ''}
                        ${!u.ativo ? ' <span class="t-10 t-mudo">(inativo)</span>' : ''}
                    </div>
                </div>
            </td>
            <td><span class="t-mono t-12">${u.usuario}</span></td>
            <td><span style="color:${perfilCor[u.perfil]||'var(--text-muted)'}"><i class="fa-solid fa-circle" style="font-size:8px;margin-right:4px"></i>${u.perfil}</span></td>
            <td>
                <button class="btn-icon" title="Editar" onclick="abrirModalUsuario(${u.id})"><i class="fa-solid fa-pen"></i></button>
                ${!euMesmo ? html`<button class="btn-icon btn-icon-danger" title="Excluir" onclick="excluirUsuario(${u.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

async function salvarUsuario() {
    const modal  = document.getElementById('modalUsuario');
    const editId = modal._editId;

    const nome   = document.getElementById('usuarioNome').value.trim();
    const login  = document.getElementById('usuarioUsername').value.trim();
    const senha  = document.getElementById('usuarioSenha').value.trim();
    const perfil = document.getElementById('usuarioPerfil').value;

    if (!nome || !login) { mostrarNotificacao('Nome e usuário são obrigatórios.', 'erro'); return; }
    if (!editId && !senha) { mostrarNotificacao('Informe uma senha.', 'erro'); return; }
    if (senha && senha.length < 6) { mostrarNotificacao('A senha deve ter pelo menos 6 caracteres.', 'erro'); return; }

    const dados = { nome, usuario: login, perfil, ativo: document.getElementById('usuarioAtivo').checked };
    if (senha) dados.senha = senha;

    try {
        await salvarUsuarioNoBanco(dados, editId);
        fecharModalUsuario();
        await renderizarUsuarios();
        mostrarNotificacao(editId ? 'Usuário atualizado!' : 'Usuário criado!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível salvar o usuário.', 'erro');
    }
}

function excluirUsuario(id) {
    const u = usuarios.find(x => String(x.id) === String(id));
    abrirConfirmacao(`Excluir o usuário "${u?.nome}"?`, async () => {
        try {
            await excluirUsuarioNoBanco(id);
            await renderizarUsuarios();
            mostrarNotificacao('Usuário excluído.');
        } catch (erro) {
            mostrarNotificacao(erro.message || 'Não foi possível excluir o usuário.', 'erro');
        }
    }, 'Excluir usuário');
}

// ─── PERFIL PESSOAL ────────────────────
// Usa /api/auth/me (perfil de quem está logado), não /api/usuarios.

async function salvarPerfil() {
    const nome       = document.getElementById('perfilNome').value.trim();
    const senhaAtual = document.getElementById('perfilSenhaAtual').value.trim();
    const novaSenha  = document.getElementById('perfilNovaSenha').value.trim();

    if (!nome) { mostrarNotificacao('Informe seu nome.', 'erro'); return; }
    if (novaSenha && novaSenha.length < 6) { mostrarNotificacao('A nova senha deve ter pelo menos 6 caracteres.', 'erro'); return; }
    if (novaSenha && !senhaAtual) { mostrarNotificacao('Informe a senha atual para definir uma nova.', 'erro'); return; }

    try {
        const dados = { nome };
        if (novaSenha) { dados.senhaAtual = senhaAtual; dados.novaSenha = novaSenha; }

        const atualizado = await apiRequest('/auth/me', { method: 'PUT', body: JSON.stringify(dados) });

        const sessao = carregarSessao();
        salvarSessao({ ...sessao, nome: atualizado.nome });

        const elNome = document.getElementById('usuarioLogado');
        if (elNome) elNome.textContent = atualizado.nome;
        const iniciais = document.getElementById('userIniciais');
        if (iniciais) iniciais.textContent = atualizado.nome.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();

        fecharModalPerfil();
        mostrarNotificacao('Perfil atualizado!');
    } catch (erro) {
        mostrarNotificacao(erro.message || 'Não foi possível atualizar o perfil.', 'erro');
    }
}
