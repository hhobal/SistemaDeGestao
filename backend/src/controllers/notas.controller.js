// ======================================
// NOTAS
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const notaSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório.'),
  conteudo: z.string().trim().optional().default(''),
  cor: z.string().trim().optional().default('#1e2430')
});

const listar = asyncHandler(async (req, res) => {
  const notas = await prisma.nota.findMany({ orderBy: { criadoEm: 'desc' } });
  res.json(notas);
});

const criar = asyncHandler(async (req, res) => {
  const nota = await prisma.nota.create({ data: req.body });
  res.status(201).json(nota);
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.nota.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Nota não encontrada.');
  const nota = await prisma.nota.update({ where: { id }, data: req.body });
  res.json(nota);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.nota.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Nota não encontrada.');
  await prisma.nota.delete({ where: { id } });
  res.status(204).send();
});

module.exports = { notaSchema, listar, criar, atualizar, excluir };
