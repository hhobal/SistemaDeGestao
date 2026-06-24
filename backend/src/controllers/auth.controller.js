// ======================================
// AUTENTICAÇÃO — EQUIPE INTERNA
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { gerarHash, conferirSenha } = require('../utils/senha');
const { gerarTokenUsuario } = require('../utils/jwt');
const { registrarLog } = require('../services/log.service');

const loginSchema = z.object({
  usuario: z.string().trim().min(1, 'Informe o usuário.'),
  senha: z.string().min(1, 'Informe a senha.')
});

const alterarSenhaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.'),
  senhaAtual: z.string().optional(),
  novaSenha: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.').optional()
});

function semSenha(usuario) {
  const { senhaHash, ...resto } = usuario; // eslint-disable-line no-unused-vars
  return resto;
}

const login = asyncHandler(async (req, res) => {
  const { usuario, senha } = req.body;

  const encontrado = await prisma.usuario.findUnique({ where: { usuario } });
  if (!encontrado || !encontrado.ativo) {
    throw ApiError.naoAutorizado('Usuário ou senha inválidos.');
  }

  const senhaOk = await conferirSenha(senha, encontrado.senhaHash);
  if (!senhaOk) {
    throw ApiError.naoAutorizado('Usuário ou senha inválidos.');
  }

  const token = gerarTokenUsuario(encontrado);
  await registrarLog({ usuario: encontrado.nome, acao: 'Login', modulo: 'Sistema' });

  res.json({ token, usuario: semSenha(encontrado) });
});

const me = asyncHandler(async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
  if (!usuario) throw ApiError.naoEncontrado('Usuário não encontrado.');
  res.json(semSenha(usuario));
});

const atualizarPerfil = asyncHandler(async (req, res) => {
  const { nome, senhaAtual, novaSenha } = req.body;

  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
  if (!usuario) throw ApiError.naoEncontrado('Usuário não encontrado.');

  const dados = { nome };

  if (novaSenha) {
    if (!senhaAtual) throw ApiError.badRequest('Informe a senha atual para definir uma nova.');
    const ok = await conferirSenha(senhaAtual, usuario.senhaHash);
    if (!ok) throw ApiError.badRequest('Senha atual incorreta.');
    dados.senhaHash = await gerarHash(novaSenha);
  }

  const atualizado = await prisma.usuario.update({ where: { id: usuario.id }, data: dados });
  await registrarLog({ usuario: atualizado.nome, acao: 'Editar', modulo: 'Perfil', detalhe: 'Atualização de perfil próprio' });

  res.json(semSenha(atualizado));
});

const logout = asyncHandler(async (req, res) => {
  // Com JWT stateless não há sessão para apagar no servidor; o front
  // só precisa descartar o token salvo. Mantemos o endpoint por
  // simetria com o fluxo anterior e para registrar o log de saída.
  if (req.usuario) {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
    if (usuario) await registrarLog({ usuario: usuario.nome, acao: 'Logout', modulo: 'Sistema' });
  }
  res.json({ ok: true });
});

module.exports = {
  loginSchema,
  alterarSenhaSchema,
  login,
  me,
  atualizarPerfil,
  logout
};
