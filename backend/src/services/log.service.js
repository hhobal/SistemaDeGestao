// ======================================
// SERVIÇO DE LOG DE AÇÕES (auditoria)
// ======================================
const prisma = require('../lib/prisma');

async function registrarLog({ usuario, acao, modulo, detalhe = '' }) {
  try {
    await prisma.logAcao.create({
      data: { usuario: usuario || 'Sistema', acao, modulo, detalhe }
    });
  } catch (erro) {
    // Falha ao gravar log nunca deve derrubar a operação principal.
    console.error('[LOG] Falha ao registrar log de ação:', erro.message);
  }
}

module.exports = { registrarLog };
