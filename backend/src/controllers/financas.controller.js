// ======================================
// FINANÇAS
// ======================================
// Correção em relação à versão localStorage: lá, ao filtrar lançamentos
// por tipo/status, a TABELA respeitava o filtro mas os CARDS de
// Receita/Despesa/Saldo no topo continuavam somando todos os
// lançamentos (a variável do filtro era calculada e nunca usada).
// Aqui, /resumo aceita os mesmos parâmetros de filtro de /lancamentos
// e os cards sempre refletem exatamente o que está sendo exibido.
const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { modoBusca } = require('../utils/db');
const { paginacaoQuerySchema, paginar, respostaPaginada } = require('../utils/paginacao');
const { registrarLog } = require('../services/log.service');
const relatoriosService = require('../services/relatorios.service');

const TIPOS_VALIDOS = ['receita', 'despesa'];
const STATUS_VALIDOS = ['pago', 'pendente'];

const lancamentoSchema = z.object({
  descricao: z.string().trim().min(1, 'Descrição é obrigatória.'),
  categoria: z.string().trim().optional().default(''),
  tipo: z.enum(TIPOS_VALIDOS),
  valor: z.coerce.number().positive('Valor deve ser maior que zero.'),
  status: z.enum(STATUS_VALIDOS).default('pendente'),
  data: z.coerce.date().optional()
});

const filtroQuerySchema = paginacaoQuerySchema.extend({
  tipo: z.enum([...TIPOS_VALIDOS, '']).optional().default(''),
  status: z.enum([...STATUS_VALIDOS, '']).optional().default('')
});

function montarWhere({ tipo, status, busca }) {
  return {
    AND: [
      tipo ? { tipo } : {},
      status ? { status } : {},
      busca
        ? { OR: [{ descricao: { contains: busca, ...modoBusca() } }, { categoria: { contains: busca, ...modoBusca() } }] }
        : {}
    ]
  };
}

const listar = asyncHandler(async (req, res) => {
  const where = montarWhere(req.query);
  const { skip, take, pagina, porPagina } = paginar(req.query);

  const [itens, total] = await Promise.all([
    prisma.lancamento.findMany({ where, skip, take, orderBy: { data: 'desc' } }),
    prisma.lancamento.count({ where })
  ]);

  res.json(respostaPaginada({ itens, total, pagina, porPagina }));
});

// Cards de Receita/Despesa/Saldo — SEMPRE respeitando os mesmos filtros
// que a listagem (tipo/status/busca), corrigindo o bug original: lá, o
// código já calculava uma lista filtrada para os cards (variável
// "lancsFiltrados") mas usava por engano a lista inteira na soma.
const resumo = asyncHandler(async (req, res) => {
  const where = montarWhere(req.query);
  const filtrados = await prisma.lancamento.findMany({ where, select: { tipo: true, valor: true } });

  // Somatório com Decimal: é justamente aqui, acumulando muitas linhas,
  // que o erro de ponto flutuante deixa de ser invisível.
  const somar = tipo => filtrados
    .filter(l => l.tipo === tipo)
    .reduce((soma, l) => soma.add(new Prisma.Decimal(l.valor)), new Prisma.Decimal(0));

  const receita = somar('receita');
  const despesa = somar('despesa');
  const pendentes = await prisma.lancamento.count({ where: { ...where, AND: [...where.AND, { status: 'pendente' }] } });

  res.json({ receita, despesa, saldo: receita.sub(despesa), pendentes });
});

// Série mensal (últimos 12 meses) para o gráfico de faturamento.
// Lógica compartilhada com o dashboard (ver relatorios.service.js).
const mensal = asyncHandler(async (req, res) => {
  const meses = await relatoriosService.faturamentoMensal(12);
  res.json(meses);
});

const obter = asyncHandler(async (req, res) => {
  const lancamento = await prisma.lancamento.findUnique({ where: { id: Number(req.params.id) } });
  if (!lancamento) throw ApiError.naoEncontrado('Lançamento não encontrado.');
  res.json(lancamento);
});

const criar = asyncHandler(async (req, res) => {
  const lancamento = await prisma.lancamento.create({ data: req.body });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Criar', modulo: 'Finanças', detalhe: lancamento.descricao });
  res.status(201).json(lancamento);
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.lancamento.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Lançamento não encontrado.');

  if (existente.pedidoId || existente.osId) {
    throw ApiError.conflito('Este lançamento foi gerado automaticamente por um pedido ou O.S. e não pode ser editado diretamente.');
  }

  const lancamento = await prisma.lancamento.update({ where: { id }, data: req.body });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Editar', modulo: 'Finanças', detalhe: lancamento.descricao });
  res.json(lancamento);
});

const alterarStatusSchema = z.object({ status: z.enum(STATUS_VALIDOS) });

const alterarStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.lancamento.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Lançamento não encontrado.');

  const lancamento = await prisma.lancamento.update({ where: { id }, data: { status: req.body.status } });
  res.json(lancamento);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.lancamento.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Lançamento não encontrado.');

  if (existente.pedidoId || existente.osId) {
    throw ApiError.conflito('Este lançamento foi gerado automaticamente por um pedido ou O.S. Cancele a origem em vez de excluir aqui.');
  }

  await prisma.lancamento.delete({ where: { id } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Excluir', modulo: 'Finanças', detalhe: existente.descricao });
  res.status(204).send();
});

module.exports = {
  lancamentoSchema,
  filtroQuerySchema,
  alterarStatusSchema,
  listar,
  resumo,
  mensal,
  obter,
  criar,
  atualizar,
  alterarStatus,
  excluir
};
