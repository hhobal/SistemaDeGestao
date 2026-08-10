// ======================================
// SERVIÇO DE RELATÓRIOS / DASHBOARD
// ======================================
// Correção em relação à versão localStorage: lá, o card "Faturamento",
// o gráfico mensal e o ranking "Top clientes" olhavam só para Ordens
// de Serviço — vendas da loja virtual não entravam em nenhuma conta.
//
// Aqui usamos a tabela `lancamentos_financeiros` como fonte única de
// verdade: tanto um Pedido entregue quanto uma O.S. concluída geram um
// lançamento de receita ali (ver pedidos.service.js e os.service.js).
// Somando essa tabela, o faturamento sempre reflete os dois canais
// automaticamente, sem duplicar lógica de agregação.
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

async function faturamentoMensal(mesesAtras = 12) {
  const lancamentos = await prisma.lancamento.findMany({
    where: { tipo: 'receita', status: 'pago' },
    select: { valor: true, data: true }
  });

  const porMes = {};
  for (const l of lancamentos) {
    const chave = `${l.data.getFullYear()}-${String(l.data.getMonth() + 1).padStart(2, '0')}`;
    porMes[chave] = (porMes[chave] || new Prisma.Decimal(0)).add(new Prisma.Decimal(l.valor));
  }

  return Object.keys(porMes).sort().slice(-mesesAtras).map(chave => ({ mes: chave, total: porMes[chave] }));
}

async function faturamentoTotal() {
  const agg = await prisma.lancamento.aggregate({
    where: { tipo: 'receita', status: 'pago' },
    _sum: { valor: true }
  });
  return agg._sum.valor || 0;
}

// Ranking de clientes por valor total comprado (pedidos entregues +
// O.S. concluídas), combinando as duas origens por clienteId.
async function topClientes(limite = 5) {
  const lancamentos = await prisma.lancamento.findMany({
    where: { tipo: 'receita', status: 'pago', OR: [{ pedidoId: { not: null } }, { osId: { not: null } }] },
    include: {
      pedido: { select: { clienteId: true, cliente: { select: { id: true, nome: true } } } },
      os: { select: { clienteId: true, cliente: { select: { id: true, nome: true } } } }
    }
  });

  const porCliente = {};
  for (const l of lancamentos) {
    const cliente = l.pedido?.cliente || l.os?.cliente;
    if (!cliente) continue; // lançamento manual sem cliente associado
    if (!porCliente[cliente.id]) {
      porCliente[cliente.id] = { id: cliente.id, nome: cliente.nome, total: new Prisma.Decimal(0), compras: 0 };
    }
    porCliente[cliente.id].total = porCliente[cliente.id].total.add(new Prisma.Decimal(l.valor));
    porCliente[cliente.id].compras += 1;
  }

  // .cmp() em vez de b.total - a.total: a subtração converteria os
  // Decimal para número e a ordenação poderia trocar dois clientes com
  // valores muito próximos.
  return Object.values(porCliente).sort((a, b) => b.total.cmp(a.total)).slice(0, limite);
}

async function distribuicaoStatusOS() {
  const status = ['aberta', 'andamento', 'concluida', 'cancelada'];
  const contagens = await Promise.all(status.map(s => prisma.ordemServico.count({ where: { status: s } })));
  return status.map((s, i) => ({ status: s, total: contagens[i] }));
}

async function alertas() {
  const hoje = new Date();

  const [produtos, contasVencidas, osUrgentes] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true } }),
    prisma.lancamento.findMany({ where: { status: 'pendente', data: { lt: hoje } }, orderBy: { data: 'asc' }, take: 20 }),
    prisma.ordemServico.findMany({ where: { prioridade: 'urgente', status: { in: ['aberta', 'andamento'] } } })
  ]);

  const estoqueCritico = produtos.filter(p => p.estoque <= p.estoqueMin);

  return {
    estoqueCritico,
    contasVencidas,
    osUrgentes
  };
}

module.exports = { faturamentoMensal, faturamentoTotal, topClientes, distribuicaoStatusOS, alertas };
