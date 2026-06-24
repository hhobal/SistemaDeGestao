// ======================================
// SERVIÇO DE PEDIDOS
// ======================================
// Decisão de design (melhoria em relação à versão localStorage):
// o estoque agora é debitado no momento da CRIAÇÃO do pedido (dentro
// de uma transação atômica), não apenas quando o status muda para
// "entregue". Isso evita vender a última unidade de um produto duas
// vezes para clientes diferentes — o problema mais sério encontrado
// na auditoria do front-end. A receita só é marcada como "paga"
// quando o pedido é efetivamente entregue; o custo (CMV) é lançado
// como pago de imediato, pois a mercadoria já saiu do estoque.
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const { registrarLog } = require('./log.service');

const STATUS_VALIDOS = ['pendente', 'processando', 'enviado', 'entregue', 'cancelado'];
const STATUS_FINAL = ['entregue', 'cancelado'];

// Mesma lógica de utils/numeracao.js, mas reaproveitando a transação (tx)
// em vez do client global do prisma — necessário para que a numeração
// faça parte da mesma transação atômica da criação do pedido.
async function proximoNumeroDentroDaTransacao(tx, chave) {
  const contador = await tx.contador.upsert({
    where: { chave },
    create: { chave, valor: 1 },
    update: { valor: { increment: 1 } }
  });
  return String(contador.valor).padStart(4, '0');
}

async function criarPedido({ clienteId, itensCarrinho, enderecoEntrega, pagamento, parcelas }) {
  if (!itensCarrinho || itensCarrinho.length === 0) {
    throw ApiError.badRequest('O carrinho está vazio.');
  }

  return prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) throw ApiError.naoEncontrado('Cliente não encontrado.');

    let total = 0;
    const itensParaCriar = [];
    const atualizacoesEstoque = [];
    const movimentosEstoque = [];
    let custoTotal = 0;

    for (const itemCarrinho of itensCarrinho) {
      const produto = await tx.produto.findUnique({ where: { id: itemCarrinho.produtoId } });
      if (!produto || !produto.ativo) {
        throw ApiError.badRequest(`Produto não encontrado ou indisponível (id ${itemCarrinho.produtoId}).`);
      }
      if (produto.estoque < itemCarrinho.quantidade) {
        throw ApiError.conflito(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}.`);
      }

      // Preço e custo vêm sempre do banco — nunca confiar no valor enviado
      // pelo navegador, que poderia ser manipulado no checkout.
      const subtotal = produto.preco * itemCarrinho.quantidade;
      total += subtotal;
      custoTotal += produto.custo * itemCarrinho.quantidade;

      itensParaCriar.push({
        produtoId: produto.id,
        nome: produto.nome,
        precoUnitario: produto.preco,
        quantidade: itemCarrinho.quantidade,
        subtotal
      });

      atualizacoesEstoque.push({ id: produto.id, novoEstoque: produto.estoque - itemCarrinho.quantidade });
      movimentosEstoque.push({
        produtoId: produto.id,
        tipo: 'saida',
        quantidade: itemCarrinho.quantidade,
        responsavel: 'Loja'
      });
    }

    const numero = await proximoNumeroDentroDaTransacao(tx, 'pedido');

    const pedido = await tx.pedido.create({
      data: {
        numero,
        clienteId,
        enderecoEntrega,
        total,
        pagamento,
        parcelas: parcelas || 1,
        status: 'pendente',
        itens: { create: itensParaCriar }
      },
      include: { itens: true, cliente: true }
    });

    // Debita estoque e registra movimentações
    for (const atualizacao of atualizacoesEstoque) {
      await tx.produto.update({ where: { id: atualizacao.id }, data: { estoque: atualizacao.novoEstoque } });
    }
    for (const mov of movimentosEstoque) {
      await tx.movimento.create({ data: { ...mov, motivo: `Pedido #${numero}` } });
    }

    // Lançamentos financeiros: receita pendente + CMV já pago
    await tx.lancamento.create({
      data: {
        descricao: `Venda — Pedido #${numero} (${cliente.nome})`,
        categoria: 'Venda de produtos',
        tipo: 'receita',
        valor: total,
        status: 'pendente',
        pedidoId: pedido.id
      }
    });
    if (custoTotal > 0) {
      await tx.lancamento.create({
        data: {
          descricao: `CMV — Pedido #${numero}`,
          categoria: 'Custo de mercadoria',
          tipo: 'despesa',
          valor: custoTotal,
          status: 'pago',
          pedidoId: pedido.id
        }
      });
    }

    return pedido;
  });
}

async function alterarStatusPedido(pedidoId, novoStatus, nomeUsuario) {
  if (!STATUS_VALIDOS.includes(novoStatus)) {
    throw ApiError.badRequest(`Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}.`);
  }

  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: pedidoId }, include: { itens: true } });
    if (!pedido) throw ApiError.naoEncontrado('Pedido não encontrado.');

    if (STATUS_FINAL.includes(pedido.status)) {
      throw ApiError.conflito(`Pedido já está em status final ("${pedido.status}") e não pode mudar para "${novoStatus}".`);
    }

    const statusAnterior = pedido.status;

    if (novoStatus === 'entregue') {
      // Marca a receita pendente como paga (não cria lançamento novo,
      // pois o estoque e o CMV já foram debitados na criação do pedido).
      await tx.lancamento.updateMany({
        where: { pedidoId: pedido.id, tipo: 'receita' },
        data: { status: 'pago', data: new Date() }
      });
    }

    if (novoStatus === 'cancelado') {
      // Devolve estoque (o pedido sempre debitou estoque na criação)
      for (const item of pedido.itens) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoque: { increment: item.quantidade } }
        });
        await tx.movimento.create({
          data: {
            produtoId: item.produtoId,
            tipo: 'entrada',
            quantidade: item.quantidade,
            motivo: `Devolução — Pedido cancelado #${pedido.numero}`,
            responsavel: nomeUsuario || 'Sistema'
          }
        });
      }
      // Estorna lançamentos financeiros vinculados ao pedido
      await tx.lancamento.deleteMany({ where: { pedidoId: pedido.id } });
    }

    const atualizado = await tx.pedido.update({
      where: { id: pedidoId },
      data: { status: novoStatus },
      include: { itens: true, cliente: true }
    });

    await registrarLog({
      usuario: nomeUsuario,
      acao: 'Status pedido',
      modulo: 'Pedidos',
      detalhe: `#${pedido.numero} ${statusAnterior} → ${novoStatus}`
    });

    return atualizado;
  });
}

module.exports = {
  STATUS_VALIDOS,
  criarPedido,
  alterarStatusPedido
};
