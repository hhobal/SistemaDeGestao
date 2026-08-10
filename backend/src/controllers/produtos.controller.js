// ======================================
// PRODUTOS / SERVIÇOS
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { modoBusca } = require('../utils/db');
const { paginacaoQuerySchema, paginar, respostaPaginada } = require('../utils/paginacao');
const { registrarLog } = require('../services/log.service');

const vazioParaNulo = v => (v === '' || v === undefined ? null : v);

const produtoSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  codigo: z.preprocess(vazioParaNulo, z.string().trim().nullable().optional()),
  categoria: z.string().trim().optional().default(''),
  preco: z.coerce.number().min(0, 'Preço não pode ser negativo.'),
  custo: z.coerce.number().min(0).optional().default(0),
  estoque: z.coerce.number().int().min(0).optional().default(0),
  estoqueMin: z.coerce.number().int().min(0).optional().default(0),
  descricao: z.string().trim().optional().default(''),
  ativo: z.coerce.boolean().optional().default(true)
});

const listarQuerySchema = paginacaoQuerySchema.extend({
  categoria: z.string().trim().optional().default('')
});

const listar = asyncHandler(async (req, res) => {
  const { busca, categoria } = req.query;
  const { skip, take, pagina, porPagina } = paginar(req.query);

  const where = {
    AND: [
      categoria ? { categoria } : {},
      busca
        ? {
            OR: [
              { nome: { contains: busca, ...modoBusca() } },
              { codigo: { contains: busca, ...modoBusca() } }
            ]
          }
        : {}
    ]
  };

  const [itens, total] = await Promise.all([
    prisma.produto.findMany({ where, skip, take, orderBy: { nome: 'asc' } }),
    prisma.produto.count({ where })
  ]);

  res.json(respostaPaginada({ itens, total, pagina, porPagina }));
});

// Catálogo público da loja: só produtos ativos, com preço e em estoque.
const listarPublico = asyncHandler(async (req, res) => {
  const { busca = '', categoria = '' } = req.query;

  const where = {
    AND: [
      { ativo: true },
      { preco: { gt: 0 } },
      { estoque: { gt: 0 } },
      categoria ? { categoria } : {},
      busca
        ? {
            OR: [
              { nome: { contains: busca, ...modoBusca() } },
              { codigo: { contains: busca, ...modoBusca() } }
            ]
          }
        : {}
    ]
  };

  // `select` explícito: sem ele o Prisma devolve a linha inteira, e a
  // loja é pública. O campo `custo` vazava a margem de lucro para
  // qualquer visitante que abrisse o DevTools — quem compra sabia
  // exatamente quanto o produto custou. Listar campo a campo também
  // garante que colunas internas criadas no futuro não vazem sozinhas.
  const produtos = await prisma.produto.findMany({
    where,
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      categoria: true,
      preco: true,
      descricao: true,
      estoque: true,
      estoqueMin: true, // usado no aviso de "últimas unidades"
      criadoEm: true    // usado no selo de "novo"
    }
  });
  res.json(produtos);
});

const listarCategorias = asyncHandler(async (req, res) => {
  // Os mesmos critérios de listarPublico: sem isso, a loja exibia
  // categorias que não têm nenhum produto à venda, e o cliente clicava
  // no filtro para receber uma vitrine vazia.
  const categorias = await prisma.produto.findMany({
    where: {
      categoria: { not: null },
      ativo: true,
      preco: { gt: 0 },
      estoque: { gt: 0 }
    },
    select: { categoria: true },
    distinct: ['categoria']
  });
  res.json(categorias.map(c => c.categoria).filter(Boolean).sort());
});

const obter = asyncHandler(async (req, res) => {
  const produto = await prisma.produto.findUnique({ where: { id: Number(req.params.id) } });
  if (!produto) throw ApiError.naoEncontrado('Produto não encontrado.');
  res.json(produto);
});

const criar = asyncHandler(async (req, res) => {
  const produto = await prisma.produto.create({ data: req.body });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Criar', modulo: 'Produtos', detalhe: produto.nome });
  res.status(201).json(produto);
});

const atualizar = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.produto.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Produto não encontrado.');

  const produto = await prisma.produto.update({ where: { id }, data: req.body });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Editar', modulo: 'Produtos', detalhe: produto.nome });
  res.json(produto);
});

const excluir = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existente = await prisma.produto.findUnique({ where: { id } });
  if (!existente) throw ApiError.naoEncontrado('Produto não encontrado.');

  const temHistorico = await prisma.itemPedido.count({ where: { produtoId: id } });
  if (temHistorico > 0) {
    throw ApiError.conflito(
      'Este produto já foi vendido em pedidos e não pode ser excluído (isso apagaria o histórico). ' +
      'Marque o produto como inativo para tirá-lo de circulação.'
    );
  }

  await prisma.movimento.deleteMany({ where: { produtoId: id } });
  await prisma.produto.delete({ where: { id } });
  await registrarLog({ usuario: req.usuario?.nome, acao: 'Excluir', modulo: 'Produtos', detalhe: existente.nome });
  res.status(204).send();
});

module.exports = {
  produtoSchema,
  listarQuerySchema,
  listar,
  listarPublico,
  listarCategorias,
  obter,
  criar,
  atualizar,
  excluir
};
