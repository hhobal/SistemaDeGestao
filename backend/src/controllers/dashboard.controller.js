// ======================================
// DASHBOARD
// ======================================
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const relatoriosService = require('../services/relatorios.service');

const obter = asyncHandler(async (req, res) => {
  const [
    clientesAtivos,
    osAbertas,
    pedidosPendentes,
    faturamentoTotal,
    faturamentoMensal,
    topClientes,
    alertas
  ] = await Promise.all([
    prisma.cliente.count({ where: { status: 'ativo' } }),
    prisma.ordemServico.count({ where: { status: { in: ['aberta', 'andamento'] } } }),
    prisma.pedido.count({ where: { status: 'pendente' } }),
    relatoriosService.faturamentoTotal(),
    relatoriosService.faturamentoMensal(6),
    relatoriosService.topClientes(5),
    relatoriosService.alertas()
  ]);

  res.json({
    cards: {
      clientesAtivos,
      osAbertas,
      pedidosPendentes,
      faturamentoTotal,
      estoqueCritico: alertas.estoqueCritico.length,
      contasVencidas: alertas.contasVencidas.length
    },
    faturamentoMensal,
    topClientes,
    alertas
  });
});

module.exports = { obter };
