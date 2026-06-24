// ======================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ======================================
const { verificarTokenUsuario, verificarTokenCliente } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const prisma = require('../lib/prisma');

function extrairToken(req) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');
  if (tipo !== 'Bearer' || !token) return null;
  return token;
}

// ─── EQUIPE INTERNA (painel de gestão) ──────────────────
function autenticar(req, res, next) {
  const token = extrairToken(req);
  if (!token) return next(ApiError.naoAutorizado('Faça login para continuar.'));

  try {
    const payload = verificarTokenUsuario(token);
    if (payload.tipo !== 'usuario') throw new Error('tipo de token incorreto');
    req.usuario = payload; // { id, perfil, tipo }
    next();
  } catch {
    next(ApiError.naoAutorizado('Sessão inválida ou expirada. Faça login novamente.'));
  }
}

// Garante que o usuário do token ainda existe e está ativo no banco.
// Sem isso, um usuário excluído continuaria usando o sistema até o
// token expirar (no Sistema de Gestão V6 original, isso simplesmente
// não era verificado nunca).
async function autenticarEVerificarAtivo(req, res, next) {
  autenticar(req, res, async (erro) => {
    if (erro) return next(erro);
    try {
      const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
      if (!usuario || !usuario.ativo) {
        return next(ApiError.naoAutorizado('Usuário inativo ou removido.'));
      }
      req.usuario.nome = usuario.nome;
      req.usuario.usuarioLogin = usuario.usuario;
      next();
    } catch (e) {
      next(e);
    }
  });
}

// Restringe a rota a perfis específicos. Uso: requerPerfil('Administrador')
function requerPerfil(...perfis) {
  return (req, res, next) => {
    if (!req.usuario) return next(ApiError.naoAutorizado());
    if (!perfis.includes(req.usuario.perfil)) {
      return next(ApiError.proibido(`Esta ação requer perfil: ${perfis.join(' ou ')}.`));
    }
    next();
  };
}

// Visitante só pode ler (GET). Bloqueia qualquer escrita.
function bloquearVisitanteEmEscrita(req, res, next) {
  const metodosDeEscrita = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (req.usuario?.perfil === 'Visitante' && metodosDeEscrita.includes(req.method)) {
    return next(ApiError.proibido('Usuários visitantes têm acesso somente leitura.'));
  }
  next();
}

// ─── CLIENTES DA LOJA VIRTUAL ───────────────────────────
function autenticarCliente(req, res, next) {
  const token = extrairToken(req);
  if (!token) return next(ApiError.naoAutorizado('Faça login na sua conta para continuar.'));

  try {
    const payload = verificarTokenCliente(token);
    if (payload.tipo !== 'cliente') throw new Error('tipo de token incorreto');
    req.cliente = payload; // { id, tipo }
    next();
  } catch {
    next(ApiError.naoAutorizado('Sessão inválida ou expirada. Faça login novamente.'));
  }
}

// Versão "opcional": preenche req.cliente se houver token válido,
// mas não bloqueia a requisição se não houver (útil em rotas públicas
// da loja que mudam de comportamento quando o visitante está logado).
function autenticarClienteOpcional(req, res, next) {
  const token = extrairToken(req);
  if (!token) return next();
  try {
    const payload = verificarTokenCliente(token);
    if (payload.tipo === 'cliente') req.cliente = payload;
  } catch {
    // token inválido/expirado: segue como visitante anônimo
  }
  next();
}

module.exports = {
  autenticar,
  autenticarEVerificarAtivo,
  requerPerfil,
  bloquearVisitanteEmEscrita,
  autenticarCliente,
  autenticarClienteOpcional
};
