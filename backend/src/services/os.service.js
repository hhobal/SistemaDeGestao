// ======================================
// SERVIÇO DE ORDENS DE SERVIÇO
// ======================================
// Correção em relação à versão localStorage: lá, concluir uma O.S. só
// atualizava o card "Faturado" da própria tela — nenhum lançamento
// era criado em Finanças, então o financeiro ficava incompleto se
// ninguém lançasse manualmente. Aqui, concluir uma O.S. com valor > 0
// gera automaticamente uma receita paga, vinculada à O.S.
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const { proximoNumero } = require('../utils/numeracao');
const { registrarLog } = require('./log.service');

const STATUS_VALIDOS = ['aberta', 'andamento', 'concluida', 'cancelada'];
const STATUS_FINAL = ['concluida', 'cancelada'];

async function criarOS(dados) {
  const numero = await proximoNumero('os');
  return prisma.ordemServico.create({
    data: { ...dados, numero },
    include: { cliente: true, responsavel: true }
  });
}

async function alterarStatusOS(osId, novoStatus, nomeUsuario) {
  if (!STATUS_VALIDOS.includes(novoStatus)) {
    throw ApiError.badRequest(`Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}.`);
  }

  const { atualizada, statusAnterior, numero } = await prisma.$transaction(async (tx) => {
    const os = await tx.ordemServico.findUnique({ where: { id: osId } });
    if (!os) throw ApiError.naoEncontrado('Ordem de serviço não encontrada.');

    if (STATUS_FINAL.includes(os.status)) {
      throw ApiError.conflito(`O.S. já está em status final ("${os.status}") e não pode mudar para "${novoStatus}".`);
    }

    const dados = { status: novoStatus };
    if (novoStatus === 'concluida') {
      dados.dataConclusao = new Date();

      if (os.valor > 0) {
        const jaTemLancamento = await tx.lancamento.findFirst({ where: { osId: os.id, tipo: 'receita' } });
        if (!jaTemLancamento) {
          await tx.lancamento.create({
            data: {
              descricao: `O.S. #${os.numero} — ${os.titulo}`,
              categoria: 'Serviço prestado',
              tipo: 'receita',
              valor: os.valor,
              status: 'pago',
              osId: os.id
            }
          });
        }
      }
    }

    const atualizada = await tx.ordemServico.update({
      where: { id: osId },
      data: dados,
      include: { cliente: true, responsavel: true }
    });

    return { atualizada, statusAnterior: os.status, numero: os.numero };
  });

  // Fora da transação pelo mesmo motivo explicado em pedidos.service.js:
  // registrarLog usa o client global e travaria esperando o lock que a
  // própria transação está segurando.
  await registrarLog({
    usuario: nomeUsuario,
    acao: 'Status O.S.',
    modulo: 'Ordens de Serviço',
    detalhe: `#${numero} ${statusAnterior} → ${novoStatus}`
  });

  return atualizada;
}

module.exports = { STATUS_VALIDOS, criarOS, alterarStatusOS };
