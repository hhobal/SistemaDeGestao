// ======================================
// AGENDA
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const eventoSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório.'),
  data: z.coerce.date(),
  hora: z.string().trim().optional().default(''),
  descricao: z.string().trim().optional().default(''),
  tipo: z.enum(['reuniao', 'tarefa', 'compromisso', 'outro']).default('outro')
});

// Lista eventos de um intervalo (usado para popular o calendário mês a mês)
const listar = asyncHandler(async (req, res) => {
  const { inicio, fim } = req.query;
  const where = {};
  if (inicio || fim) {
    where.data = {};
    if (inicio) where.data.gte = new Date(inicio);
    if (fim) where.data.lte = new Date(fim);
  }
  const eventos = await prisma.evento.findMany({ where, orderBy: { data: 'asc' } });
  res.json(eventos);
});

const obter = asyncHandler(async (req, res) => {
  const evento = await prisma.evento.findUnique({ where: { id: Number(req.params.id) } });
  if (!evento) throw ApiError.naoEncontrado('Evento não encontrado.');
  res.json(evento);
});

const criar = asyncHandler(async (req, res) => {
  const evento = await prisma.evento.create({ data: req.body });
  res.status(201).json(evento);
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.evento.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Evento não encontrado.');
  const evento = await prisma.evento.update({ where: { id }, data: req.body });
  res.json(evento);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.evento.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Evento não encontrado.');
  await prisma.evento.delete({ where: { id } });
  res.status(204).send();
});

module.exports = { eventoSchema, listar, obter, criar, atualizar, excluir };
