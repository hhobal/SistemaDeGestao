// ======================================
// USUÁRIOS DO SISTEMA
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { gerarHash } = require('../utils/senha');
const { registrarLog } = require('../services/log.service');

const PERFIS_VALIDOS = ['Administrador', 'Operador', 'Visitante'];

const criarSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  usuario: z.string().trim().min(3, 'Usuário deve ter pelo menos 3 caracteres.'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres.'),
  perfil: z.enum(PERFIS_VALIDOS).default('Operador'),
  ativo: z.coerce.boolean().optional().default(true)
});

const atualizarSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  usuario: z.string().trim().min(3, 'Usuário deve ter pelo menos 3 caracteres.'),
  senha: z.string().min(6).optional(), // se omitido, mantém a senha atual
  perfil: z.enum(PERFIS_VALIDOS),
  ativo: z.coerce.boolean()
});

function semSenha(usuario) {
  const { senhaHash, ...resto } = usuario; // eslint-disable-line no-unused-vars
  return resto;
}

const listar = asyncHandler(async (req, res) => {
  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: 'asc' } });
  res.json(usuarios.map(semSenha));
});

const obter = asyncHandler(async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: Number(req.params.id) } });
  if (!usuario) throw ApiError.naoEncontrado('Usuário não encontrado.');
  res.json(semSenha(usuario));
});

const criar = asyncHandler(async (req, res) => {
  const { senha, ...resto } = req.body;
  const senhaHash = await gerarHash(senha);
  const usuario = await prisma.usuario.create({ data: { ...resto, senhaHash } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Criar', modulo: 'Usuários', detalhe: usuario.nome });
  res.status(201).json(semSenha(usuario));
});

// Impede deixar o sistema sem nenhum Administrador ativo — sem isso,
// seria possível trancar o próprio acesso do dono do sistema sem
// nenhuma forma de recuperação além de mexer direto no banco.
async function garantirAdministradorRestante(idExcluido) {
  const outrosAdmins = await prisma.usuario.count({
    where: { perfil: 'Administrador', ativo: true, id: { not: idExcluido } }
  });
  if (outrosAdmins === 0) {
    throw ApiError.conflito('Não é possível remover/desativar/rebaixar o último Administrador ativo do sistema.');
  }
}

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.usuario.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Usuário não encontrado.');

  const { senha, ...resto } = req.body;
  const vaiDeixarDeSerAdminAtivo =
    existente.perfil === 'Administrador' && existente.ativo &&
    (resto.perfil !== 'Administrador' || resto.ativo === false);

  if (vaiDeixarDeSerAdminAtivo) {
    await garantirAdministradorRestante(id);
  }

  const dados = { ...resto };
  if (senha) dados.senhaHash = await gerarHash(senha);

  const usuario = await prisma.usuario.update({ where: { id }, data: dados });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Editar', modulo: 'Usuários', detalhe: usuario.nome });
  res.json(semSenha(usuario));
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.usuario.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Usuário não encontrado.');

  if (id === req.usuario.id) {
    throw ApiError.conflito('Você não pode excluir o próprio usuário enquanto está logado com ele.');
  }
  if (existente.perfil === 'Administrador' && existente.ativo) {
    await garantirAdministradorRestante(id);
  }

  await prisma.usuario.delete({ where: { id } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Excluir', modulo: 'Usuários', detalhe: existente.nome });
  res.status(204).send();
});

module.exports = { criarSchema, atualizarSchema, listar, obter, criar, atualizar, excluir };
