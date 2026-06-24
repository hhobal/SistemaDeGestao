// ======================================
// NUMERAÇÃO SEQUENCIAL (#0001, #0002...)
// ======================================
// Na versão anterior (localStorage), o número era calculado no navegador
// como "maior número existente + 1". Com mais de um usuário no sistema
// ao mesmo tempo, dois pedidos podem nascer com o mesmo número.
//
// Aqui usamos um upsert atômico na tabela `contadores`: o próprio banco
// garante que cada chamada recebe um valor exclusivo, mesmo com vários
// usuários clicando em "Salvar" no mesmo segundo.
const prisma = require('../lib/prisma');

async function proximoNumero(chave) {
  const contador = await prisma.contador.upsert({
    where: { chave },
    create: { chave, valor: 1 },
    update: { valor: { increment: 1 } }
  });
  return String(contador.valor).padStart(4, '0');
}

module.exports = { proximoNumero };
