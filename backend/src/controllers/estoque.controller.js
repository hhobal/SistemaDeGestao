// ======================================
// ESTOQUE
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { paginacaoQuerySchema, paginar, respostaPaginada } = require('../utils/paginacao');
const { registrarLog } = require('../services/log.service');

const movimentoSchema = z.object({
  produtoId: z.coerce.number().int().positive(),
  tipo: z.enum(['entrada', 'saida']),
  quantidade: z.coerce.number().int().positive('Quantidade deve ser maior que zero.'),
  motivo: z.string().trim().optional().default('')
});

const listarMovimentos = asyncHandler(async (req, res) => {
  const { skip, take, pagina, porPagina } = paginar(req.query);
  const produtoId = req.query.produtoId ? Number(req.query.produtoId) : undefined;

  const where = produtoId ? { produtoId } : {};

  const [itens, total] = await Promise.all([
    prisma.movimento.findMany({
      where, skip, take,
      orderBy: { data: 'desc' },
      include: { produto: true }
    }),
    prisma.movimento.count({ where })
  ]);

  res.json(respostaPaginada({ itens, total, pagina, porPagina }));
});

const criarMovimento = asyncHandler(async (req, res) => {
  const { produtoId, tipo, quantidade, motivo } = req.body;

  const movimento = await prisma.$transaction(async (tx) => {
    const produto = await tx.produto.findUnique({ where: { id: produtoId } });
    if (!produto) throw ApiError.naoEncontrado('Produto não encontrado.');

    if (tipo === 'saida' && produto.estoque < quantidade) {
      throw ApiError.conflito(`Estoque insuficiente. Disponível: ${produto.estoque}.`);
    }

    const novoEstoque = tipo === 'entrada' ? produto.estoque + quantidade : produto.estoque - quantidade;
    await tx.produto.update({ where: { id: produtoId }, data: { estoque: novoEstoque } });

    return tx.movimento.create({
      data: {
        produtoId,
        tipo,
        quantidade,
        motivo: motivo || (tipo === 'entrada' ? 'Entrada manual' : 'Saída manual'),
        responsavel: req.usuario?.nome || 'Sistema'
      },
      include: { produto: true }
    });
  });

  await registrarLog({
    usuario: req.usuario?.nome,
    acao: tipo === 'entrada' ? 'Entrada estoque' : 'Saída estoque',
    modulo: 'Estoque',
    detalhe: `${movimento.produto.nome}: ${quantidade} un.`
  });

  res.status(201).json(movimento);
});

const criticos = asyncHandler(async (req, res) => {
  // SQLite e PostgreSQL não permitem comparar duas colunas direto no
  // filtro `where` do Prisma — então filtramos em memória. Para um
  // catálogo de loja (algumas centenas/milhares de produtos), o custo
  // disso é desprezível.
  const produtos = await prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  const produtosCriticos = produtos.filter(p => p.estoque <= p.estoqueMin);
  res.json(produtosCriticos);
});

const resumo = asyncHandler(async (req, res) => {
  const produtos = await prisma.produto.findMany({ where: { ativo: true } });
  const valorTotalEstoque = produtos.reduce((s, p) => s + p.estoque * p.custo, 0);
  const criticos = produtos.filter(p => p.estoque <= p.estoqueMin && p.estoque > 0).length;
  const zerados = produtos.filter(p => p.estoque === 0).length;

  res.json({
    totalProdutos: produtos.length,
    valorTotalEstoque,
    criticos,
    zerados
  });
});

module.exports = { movimentoSchema, listarMovimentos, criarMovimento, criticos, resumo };
