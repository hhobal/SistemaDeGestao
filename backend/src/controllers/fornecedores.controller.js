// ======================================
// FORNECEDORES
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { modoBusca } = require('../utils/db');
const { paginacaoQuerySchema, paginar, respostaPaginada } = require('../utils/paginacao');
const { registrarLog } = require('../services/log.service');

const fornecedorSchema = z.object({
  empresa: z.string().trim().min(1, 'Empresa é obrigatória.'),
  contato: z.string().trim().optional().default(''),
  telefone: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  cnpj: z.string().trim().optional().default(''),
  categoria: z.string().trim().optional().default('')
});

const listar = asyncHandler(async (req, res) => {
  const { busca } = req.query;
  const { skip, take, pagina, porPagina } = paginar(req.query);

  const where = busca
    ? {
        OR: [
          { empresa: { contains: busca, ...modoBusca() } },
          { contato: { contains: busca, ...modoBusca() } },
          { cnpj: { contains: busca } }
        ]
      }
    : {};

  const [itens, total] = await Promise.all([
    prisma.fornecedor.findMany({ where, skip, take, orderBy: { empresa: 'asc' } }),
    prisma.fornecedor.count({ where })
  ]);

  res.json(respostaPaginada({ itens, total, pagina, porPagina }));
});

const obter = asyncHandler(async (req, res) => {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id: Number(req.params.id) } });
  if (!fornecedor) throw ApiError.naoEncontrado('Fornecedor não encontrado.');
  res.json(fornecedor);
});

const criar = asyncHandler(async (req, res) => {
  const fornecedor = await prisma.fornecedor.create({ data: req.body });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Criar', modulo: 'Fornecedores', detalhe: fornecedor.empresa });
  res.status(201).json(fornecedor);
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.fornecedor.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Fornecedor não encontrado.');

  const fornecedor = await prisma.fornecedor.update({ where: { id }, data: req.body });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Editar', modulo: 'Fornecedores', detalhe: fornecedor.empresa });
  res.json(fornecedor);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.fornecedor.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Fornecedor não encontrado.');

  await prisma.fornecedor.delete({ where: { id } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Excluir', modulo: 'Fornecedores', detalhe: existente.empresa });
  res.status(204).send();
});

module.exports = { fornecedorSchema, listar, obter, criar, atualizar, excluir };
