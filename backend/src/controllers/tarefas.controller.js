// ======================================
// TAREFAS (KANBAN)
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const STATUS_VALIDOS = ['backlog', 'andamento', 'revisao', 'concluido'];

const tarefaSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório.'),
  descricao: z.string().trim().optional().default(''),
  prioridade: z.enum(['baixa', 'media', 'alta']).default('media'),
  status: z.enum(STATUS_VALIDOS).default('backlog'),
  dataLimite: z.coerce.date().nullable().optional(),
  responsavelId: z.coerce.number().int().positive().nullable().optional()
});

const alterarStatusSchema = z.object({ status: z.enum(STATUS_VALIDOS) });

const listar = asyncHandler(async (req, res) => {
  const tarefas = await prisma.tarefa.findMany({
    include: { responsavel: true },
    orderBy: { id: 'desc' }
  });
  res.json(tarefas);
});

const criar = asyncHandler(async (req, res) => {
  const tarefa = await prisma.tarefa.create({ data: req.body, include: { responsavel: true } });
  res.status(201).json(tarefa);
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.tarefa.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Tarefa não encontrada.');
  const tarefa = await prisma.tarefa.update({ where: { id }, data: req.body, include: { responsavel: true } });
  res.json(tarefa);
});

// Usado pelo drag-and-drop do quadro kanban.
const alterarStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.tarefa.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Tarefa não encontrada.');
  const tarefa = await prisma.tarefa.update({ where: { id }, data: { status: req.body.status } });
  res.json(tarefa);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.tarefa.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Tarefa não encontrada.');
  await prisma.tarefa.delete({ where: { id } });
  res.status(204).send();
});

module.exports = { tarefaSchema, alterarStatusSchema, listar, criar, atualizar, alterarStatus, excluir };
