// ======================================
// CLIENTES
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { modoBusca } = require('../utils/db');
const { paginacaoQuerySchema, paginar, respostaPaginada } = require('../utils/paginacao');
const { registrarLog } = require('../services/log.service');

const STATUS_VALIDOS = ['ativo', 'inativo', 'inadimplente'];

const vazioParaNulo = v => (v === '' || v === undefined ? null : v);

const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  email: z.preprocess(vazioParaNulo, z.string().email('E-mail inválido.').nullable().optional()),
  telefone: z.string().trim().optional().default(''),
  cpf: z.preprocess(vazioParaNulo, z.string().nullable().optional()),
  endereco: z.string().trim().optional().default(''),
  observacao: z.string().trim().optional().default(''),
  status: z.enum(STATUS_VALIDOS).default('ativo')
});

const listarQuerySchema = paginacaoQuerySchema.extend({
  status: z.enum([...STATUS_VALIDOS, '']).optional().default('')
});

function semSenha(cliente) {
  const { senhaHash, ...resto } = cliente; // eslint-disable-line no-unused-vars
  return resto;
}

const listar = asyncHandler(async (req, res) => {
  const { busca, status } = req.query;
  const { skip, take, pagina, porPagina } = paginar(req.query);

  const where = {
    AND: [
      status ? { status } : {},
      busca
        ? {
            OR: [
              { nome: { contains: busca, ...modoBusca() } },
              { email: { contains: busca, ...modoBusca() } },
              { telefone: { contains: busca } },
              { cpf: { contains: busca } }
            ]
          }
        : {}
    ]
  };

  const [itens, total] = await Promise.all([
    prisma.cliente.findMany({ where, skip, take, orderBy: { nome: 'asc' } }),
    prisma.cliente.count({ where })
  ]);

  res.json(respostaPaginada({ itens: itens.map(semSenha), total, pagina, porPagina }));
});

const obter = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) throw ApiError.naoEncontrado('Cliente não encontrado.');
  res.json(semSenha(cliente));
});

const criar = asyncHandler(async (req, res) => {
  const cliente = await prisma.cliente.create({ data: { ...req.body, origem: 'manual' } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Criar', modulo: 'Clientes', detalhe: cliente.nome });
  res.status(201).json(semSenha(cliente));
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Cliente não encontrado.');

  const cliente = await prisma.cliente.update({ where: { id }, data: req.body });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Editar', modulo: 'Clientes', detalhe: cliente.nome });
  res.json(semSenha(cliente));
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.cliente.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Cliente não encontrado.');

  const possuiPedidos = await prisma.pedido.count({ where: { clienteId: id } });
  const possuiOS = await prisma.ordemServico.count({ where: { clienteId: id } });
  if (possuiPedidos > 0 || possuiOS > 0) {
    throw ApiError.conflito(
      'Este cliente possui pedidos ou ordens de serviço vinculados e não pode ser excluído. ' +
      'Considere marcar o status como "inativo" em vez de excluir.'
    );
  }

  await prisma.cliente.delete({ where: { id } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Excluir', modulo: 'Clientes', detalhe: existente.nome });
  res.status(204).send();
});

module.exports = {
  clienteSchema,
  listarQuerySchema,
  listar,
  obter,
  criar,
  atualizar,
  excluir
};
