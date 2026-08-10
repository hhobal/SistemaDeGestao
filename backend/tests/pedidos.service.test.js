// ======================================
// PEDIDOS — REGRA DE NEGÓCIO E TRANSAÇÃO
// ======================================
// O checkout é a operação mais crítica do sistema: em uma única
// transação ele reserva estoque, congela preços, numera o pedido e
// lança o financeiro. Se qualquer etapa falhar, nada pode sobrar.

// describe/it/expect/beforeEach vêm do Vitest como globais
// (`globals: true` em vitest.config.js) — o pacote não pode ser
// carregado com require() em projeto CommonJS.
const { criarPedido, alterarStatusPedido } = require('../src/services/pedidos.service');
const { prisma, limparBanco, criarCliente, criarProduto } = require('./helpers/db');

beforeEach(limparBanco);

describe('criarPedido', () => {
  it('debita o estoque e registra a movimentação de saída', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto({ estoque: 10, preco: 50 });

    await criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 3 }],
      pagamento: 'pix'
    });

    const depois = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(depois.estoque).toBe(7);

    const movimentos = await prisma.movimento.findMany({ where: { produtoId: produto.id } });
    expect(movimentos).toHaveLength(1);
    expect(movimentos[0].tipo).toBe('saida');
    expect(movimentos[0].quantidade).toBe(3);
  });

  it('calcula o total a partir do preço do banco, ignorando o valor enviado pelo cliente', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto({ preco: 100, estoque: 5 });

    // Simula um checkout adulterado no navegador: o cliente tenta
    // enviar preço 1 para um produto que custa 100.
    const pedido = await criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 2, preco: 1, subtotal: 2 }],
      pagamento: 'cartao'
    });

    expect(pedido.total).toBe(200);
    expect(pedido.itens[0].precoUnitario).toBe(100);
  });

  it('congela nome e preço do produto no item do pedido (snapshot histórico)', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto({ nome: 'Teclado', preco: 200, estoque: 5 });

    const pedido = await criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 1 }],
      pagamento: 'pix'
    });

    // O produto muda depois da compra — o pedido antigo não pode mudar.
    await prisma.produto.update({
      where: { id: produto.id },
      data: { nome: 'Teclado Mecânico RGB', preco: 350 }
    });

    const itens = await prisma.itemPedido.findMany({ where: { pedidoId: pedido.id } });
    expect(itens[0].nome).toBe('Teclado');
    expect(itens[0].precoUnitario).toBe(200);

    const recarregado = await prisma.pedido.findUnique({ where: { id: pedido.id } });
    expect(recarregado.total).toBe(200);
  });

  it('gera números sequenciais com zero à esquerda', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto({ estoque: 100 });

    const primeiro = await criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 1 }],
      pagamento: 'pix'
    });
    const segundo = await criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 1 }],
      pagamento: 'pix'
    });

    expect(primeiro.numero).toBe('0001');
    expect(segundo.numero).toBe('0002');
  });

  it('cria receita pendente e CMV pago', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto({ preco: 100, custo: 40, estoque: 10 });

    const pedido = await criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 2 }],
      pagamento: 'boleto'
    });

    const lancamentos = await prisma.lancamento.findMany({ where: { pedidoId: pedido.id } });
    const receita = lancamentos.find(l => l.tipo === 'receita');
    const despesa = lancamentos.find(l => l.tipo === 'despesa');

    expect(receita.valor).toBe(200);
    expect(receita.status).toBe('pendente');
    expect(despesa.valor).toBe(80);
    expect(despesa.status).toBe('pago');
  });
});

describe('criarPedido — falhas devem desfazer tudo', () => {
  it('recusa quantidade acima do estoque disponível', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto({ estoque: 2 });

    await expect(criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 5 }],
      pagamento: 'pix'
    })).rejects.toMatchObject({ status: 409 });
  });

  it('não deixa resíduo quando o segundo item falha (rollback da transação)', async () => {
    const cliente = await criarCliente();
    const disponivel = await criarProduto({ nome: 'Disponível', estoque: 10 });
    const esgotado = await criarProduto({ nome: 'Esgotado', estoque: 0 });

    await expect(criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [
        { produtoId: disponivel.id, quantidade: 1 },
        { produtoId: esgotado.id, quantidade: 1 }
      ],
      pagamento: 'pix'
    })).rejects.toMatchObject({ status: 409 });

    // Nada pode ter sido gravado: nem pedido, nem baixa de estoque,
    // nem movimentação, nem lançamento financeiro.
    expect(await prisma.pedido.count()).toBe(0);
    expect(await prisma.itemPedido.count()).toBe(0);
    expect(await prisma.movimento.count()).toBe(0);
    expect(await prisma.lancamento.count()).toBe(0);

    const intacto = await prisma.produto.findUnique({ where: { id: disponivel.id } });
    expect(intacto.estoque).toBe(10);
  });

  it('recusa carrinho vazio', async () => {
    const cliente = await criarCliente();
    await expect(criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [],
      pagamento: 'pix'
    })).rejects.toMatchObject({ status: 400 });
  });

  it('recusa produto inativo', async () => {
    const cliente = await criarCliente();
    const produto = await criarProduto({ ativo: false, estoque: 10 });

    await expect(criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 1 }],
      pagamento: 'pix'
    })).rejects.toMatchObject({ status: 400 });
  });

  it('recusa cliente inexistente', async () => {
    const produto = await criarProduto();
    await expect(criarPedido({
      clienteId: 999999,
      itensCarrinho: [{ produtoId: produto.id, quantidade: 1 }],
      pagamento: 'pix'
    })).rejects.toMatchObject({ status: 404 });
  });
});

describe('alterarStatusPedido', () => {
  async function pedidoDeTeste({ estoque = 10, quantidade = 2, preco = 100, custo = 40 } = {}) {
    const cliente = await criarCliente();
    const produto = await criarProduto({ estoque, preco, custo });
    const pedido = await criarPedido({
      clienteId: cliente.id,
      itensCarrinho: [{ produtoId: produto.id, quantidade }],
      pagamento: 'pix'
    });
    return { cliente, produto, pedido };
  }

  it('marca a receita como paga ao entregar', async () => {
    const { pedido } = await pedidoDeTeste();

    await alterarStatusPedido(pedido.id, 'entregue', 'Tester');

    const receita = await prisma.lancamento.findFirst({
      where: { pedidoId: pedido.id, tipo: 'receita' }
    });
    expect(receita.status).toBe('pago');
  });

  it('devolve o estoque e estorna o financeiro ao cancelar', async () => {
    const { produto, pedido } = await pedidoDeTeste({ estoque: 10, quantidade: 3 });

    // Confirma que o estoque foi debitado na criação.
    let atual = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(atual.estoque).toBe(7);

    await alterarStatusPedido(pedido.id, 'cancelado', 'Tester');

    atual = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(atual.estoque).toBe(10);

    const lancamentos = await prisma.lancamento.findMany({ where: { pedidoId: pedido.id } });
    expect(lancamentos).toHaveLength(0);

    const entradas = await prisma.movimento.findMany({
      where: { produtoId: produto.id, tipo: 'entrada' }
    });
    expect(entradas).toHaveLength(1);
    expect(entradas[0].quantidade).toBe(3);
  });

  it('impede alterar pedido que já está em status final', async () => {
    const { pedido } = await pedidoDeTeste();
    await alterarStatusPedido(pedido.id, 'entregue', 'Tester');

    await expect(
      alterarStatusPedido(pedido.id, 'processando', 'Tester')
    ).rejects.toMatchObject({ status: 409 });
  });

  it('recusa status fora da lista permitida', async () => {
    const { pedido } = await pedidoDeTeste();
    await expect(
      alterarStatusPedido(pedido.id, 'entregando', 'Tester')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('recusa pedido inexistente', async () => {
    await expect(
      alterarStatusPedido(999999, 'entregue', 'Tester')
    ).rejects.toMatchObject({ status: 404 });
  });
});
