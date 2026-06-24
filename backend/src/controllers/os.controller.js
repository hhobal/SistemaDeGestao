// ======================================
// ORDENS DE SERVIÇO
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { modoBusca } = require('../utils/db');
const { paginacaoQuerySchema, paginar, respostaPaginada } = require('../utils/paginacao');
const osService = require('../services/os.service');
const { registrarLog } = require('../services/log.service');

const STATUS_VALIDOS = osService.STATUS_VALIDOS;
const PRIORIDADES_VALIDAS = ['baixa', 'normal', 'alta', 'urgente'];

const osSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório.'),
  descricao: z.string().trim().optional().default(''),
  observacao: z.string().trim().optional().default(''),
  prioridade: z.enum(PRIORIDADES_VALIDAS).default('normal'),
  valor: z.coerce.number().min(0).optional().default(0),
  clienteId: z.coerce.number().int().positive().nullable().optional(),
  responsavelId: z.coerce.number().int().positive().nullable().optional()
});

const listarQuerySchema = paginacaoQuerySchema.extend({
  status: z.enum([...STATUS_VALIDOS, '']).optional().default('')
});

const alterarStatusSchema = z.object({ status: z.enum(STATUS_VALIDOS) });

const listar = asyncHandler(async (req, res) => {
  const { busca, status } = req.query;
  const { skip, take, pagina, porPagina } = paginar(req.query);

  const where = {
    AND: [
      status ? { status } : {},
      busca
        ? {
            OR: [
              { numero: { contains: busca } },
              { titulo: { contains: busca, ...modoBusca() } },
              { cliente: { nome: { contains: busca, ...modoBusca() } } }
            ]
          }
        : {}
    ]
  };

  const [itens, total] = await Promise.all([
    prisma.ordemServico.findMany({
      where, skip, take,
      orderBy: { dataAbertura: 'desc' },
      include: { cliente: true, responsavel: true }
    }),
    prisma.ordemServico.count({ where })
  ]);

  res.json(respostaPaginada({ itens, total, pagina, porPagina }));
});

const obter = asyncHandler(async (req, res) => {
  const os = await prisma.ordemServico.findUnique({
    where: { id: Number(req.params.id) },
    include: { cliente: true, responsavel: true, lancamentos: true }
  });
  if (!os) throw ApiError.naoEncontrado('Ordem de serviço não encontrada.');
  res.json(os);
});

const criar = asyncHandler(async (req, res) => {
  const os = await osService.criarOS(req.body);
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Criar', modulo: 'Ordens de Serviço', detalhe: `#${os.numero} ${os.titulo}` });
  res.status(201).json(os);
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.ordemServico.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Ordem de serviço não encontrada.');

  const os = await prisma.ordemServico.update({
    where: { id },
    data: req.body,
    include: { cliente: true, responsavel: true }
  });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Editar', modulo: 'Ordens de Serviço', detalhe: `#${os.numero}` });
  res.json(os);
});

const alterarStatus = asyncHandler(async (req, res) => {
  const os = await osService.alterarStatusOS(Number(req.params.id), req.body.status, req.usuario?.nome);
  res.json(os);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.ordemServico.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Ordem de serviço não encontrada.');

  await prisma.lancamento.deleteMany({ where: { osId: id } });
  await prisma.ordemServico.delete({ where: { id } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Excluir', modulo: 'Ordens de Serviço', detalhe: `#${existente.numero}` });
  res.status(204).send();
});

const resumo = asyncHandler(async (req, res) => {
  const [abertas, andamento, concluidas, faturadoAgg] = await Promise.all([
    prisma.ordemServico.count({ where: { status: 'aberta' } }),
    prisma.ordemServico.count({ where: { status: 'andamento' } }),
    prisma.ordemServico.count({ where: { status: 'concluida' } }),
    prisma.ordemServico.aggregate({ where: { status: 'concluida' }, _sum: { valor: true } })
  ]);
  res.json({ abertas, andamento, concluidas, faturado: faturadoAgg._sum.valor || 0 });
});

module.exports = {
  osSchema,
  listarQuerySchema,
  alterarStatusSchema,
  listar,
  obter,
  criar,
  atualizar,
  alterarStatus,
  excluir,
  resumo
};
