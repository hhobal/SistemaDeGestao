// ======================================
// PEDIDOS
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { modoBusca } = require('../utils/db');
const { paginacaoQuerySchema, paginar, respostaPaginada } = require('../utils/paginacao');
const pedidosService = require('../services/pedidos.service');

const STATUS_VALIDOS = pedidosService.STATUS_VALIDOS;

const listarQuerySchema = paginacaoQuerySchema.extend({
  status: z.enum([...STATUS_VALIDOS, '']).optional().default('')
});

const alterarStatusSchema = z.object({
  status: z.enum(STATUS_VALIDOS)
});

const itemCarrinhoSchema = z.object({
  produtoId: z.coerce.number().int().positive(),
  quantidade: z.coerce.number().int().positive()
});

const criarPedidoSchema = z.object({
  itensCarrinho: z.array(itemCarrinhoSchema).min(1, 'O carrinho está vazio.'),
  enderecoEntrega: z.string().trim().min(1, 'Informe o endereço de entrega.'),
  pagamento: z.enum(['cartao', 'pix', 'boleto']),
  parcelas: z.coerce.number().int().min(1).max(12).optional().default(1)
});

// ─── PAINEL ADMINISTRATIVO ──────────────────────────────

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
              { cliente: { nome: { contains: busca, ...modoBusca() } } }
            ]
          }
        : {}
    ]
  };

  const [itens, total] = await Promise.all([
    prisma.pedido.findMany({
      where, skip, take,
      orderBy: { data: 'desc' },
      include: { cliente: true, itens: true }
    }),
    prisma.pedido.count({ where })
  ]);

  res.json(respostaPaginada({ itens, total, pagina, porPagina }));
});

const obter = asyncHandler(async (req, res) => {
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(req.params.id) },
    include: { cliente: true, itens: { include: { produto: true } } }
  });
  if (!pedido) throw ApiError.naoEncontrado('Pedido não encontrado.');

  const custoTotal = pedido.itens.reduce((s, item) => s + (item.produto?.custo || 0) * item.quantidade, 0);
  res.json({ ...pedido, custoTotal, lucroBruto: pedido.total - custoTotal });
});

const alterarStatus = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.alterarStatusPedido(
    Number(req.params.id),
    req.body.status,
    req.usuario?.nome
  );
  res.json(pedido);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.pedido.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Pedido não encontrado.');

  if (!['cancelado'].includes(existente.status)) {
    throw ApiError.conflito(
      'Só é possível excluir pedidos já cancelados (isso preserva o estoque e o financeiro corretos). ' +
      'Cancele o pedido primeiro.'
    );
  }

  await prisma.lancamento.deleteMany({ where: { pedidoId: id } });
  await prisma.pedido.delete({ where: { id } }); // itens são removidos em cascata
  res.status(204).send();
});

// Cards de resumo (pendentes, processando, enviados, faturado) — evita
// que o front precise calcular isso buscando todos os pedidos.
const resumo = asyncHandler(async (req, res) => {
  const [pendentes, processando, enviados, faturadoAgg] = await Promise.all([
    prisma.pedido.count({ where: { status: 'pendente' } }),
    prisma.pedido.count({ where: { status: 'processando' } }),
    prisma.pedido.count({ where: { status: 'enviado' } }),
    prisma.pedido.aggregate({ where: { status: { not: 'cancelado' } }, _sum: { total: true } })
  ]);
  res.json({
    pendentes,
    processando,
    enviados,
    faturado: faturadoAgg._sum.total || 0
  });
});

// ─── LOJA VIRTUAL (cliente autenticado) ─────────────────

const criarPedidoLoja = asyncHandler(async (req, res) => {
  const pedido = await pedidosService.criarPedido({
    clienteId: req.cliente.id,
    ...req.body
  });
  res.status(201).json(pedido);
});

const meusPedidos = asyncHandler(async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { clienteId: req.cliente.id },
    orderBy: { data: 'desc' },
    include: { itens: true }
  });
  res.json(pedidos);
});

module.exports = {
  listarQuerySchema,
  alterarStatusSchema,
  criarPedidoSchema,
  listar,
  obter,
  alterarStatus,
  excluir,
  resumo,
  criarPedidoLoja,
  meusPedidos
};
