// ======================================
// RELATÓRIOS
// ======================================
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const relatoriosService = require('../services/relatorios.service');

const faturamentoMensal = asyncHandler(async (req, res) => {
  const meses = Number(req.query.meses) || 12;
  res.json(await relatoriosService.faturamentoMensal(meses));
});

const topClientes = asyncHandler(async (req, res) => {
  const limite = Number(req.query.limite) || 5;
  res.json(await relatoriosService.topClientes(limite));
});

const statusOS = asyncHandler(async (req, res) => {
  res.json(await relatoriosService.distribuicaoStatusOS());
});

const estoqueCritico = asyncHandler(async (req, res) => {
  const produtos = await prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  res.json(produtos.filter(p => p.estoque <= p.estoqueMin));
});

// Produtos mais vendidos (por quantidade), útil para decisão de compra/reposição.
const produtosMaisVendidos = asyncHandler(async (req, res) => {
  const limite = Number(req.query.limite) || 10;

  const itens = await prisma.itemPedido.findMany({
    include: { pedido: { select: { status: true } }, produto: { select: { id: true, nome: true } } }
  });

  const validos = itens.filter(i => i.pedido.status !== 'cancelado');
  const porProduto = {};
  for (const i of validos) {
    if (!porProduto[i.produtoId]) porProduto[i.produtoId] = { id: i.produtoId, nome: i.produto.nome, quantidade: 0, total: 0 };
    porProduto[i.produtoId].quantidade += i.quantidade;
    porProduto[i.produtoId].total += i.subtotal;
  }

  const ranking = Object.values(porProduto).sort((a, b) => b.quantidade - a.quantidade).slice(0, limite);
  res.json(ranking);
});

module.exports = { faturamentoMensal, topClientes, statusOS, estoqueCritico, produtosMaisVendidos };
