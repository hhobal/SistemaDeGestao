// ======================================
// NUMERAÇÃO SEQUENCIAL — CONCORRÊNCIA
// ======================================
// A versão anterior do sistema calculava o número no navegador como
// "maior existente + 1". Com dois usuários salvando ao mesmo tempo,
// ambos liam o mesmo total e geravam pedidos com número duplicado.
// A tabela `contadores` move essa responsabilidade para o banco.

const { proximoNumero } = require('../src/utils/numeracao');
const { prisma, limparBanco } = require('./helpers/db');

beforeEach(limparBanco);

describe('proximoNumero', () => {
  it('começa em 0001 e formata com 4 dígitos', async () => {
    expect(await proximoNumero('pedido')).toBe('0001');
    expect(await proximoNumero('pedido')).toBe('0002');
  });

  it('mantém contadores independentes por chave', async () => {
    await proximoNumero('pedido');
    await proximoNumero('pedido');
    const os = await proximoNumero('os');

    // A numeração de O.S. não pode ser afetada pela de pedidos.
    expect(os).toBe('0001');
  });

  it('não repete números sob chamadas concorrentes', async () => {
    // O teste que a implementação antiga não passaria: 20 chamadas
    // disparadas ao mesmo tempo precisam produzir 20 números distintos.
    const numeros = await Promise.all(
      Array.from({ length: 20 }, () => proximoNumero('pedido'))
    );

    expect(new Set(numeros).size).toBe(20);

    // E devem formar exatamente a sequência 0001..0020, sem buracos.
    expect([...numeros].sort()).toEqual(
      Array.from({ length: 20 }, (_, i) => String(i + 1).padStart(4, '0'))
    );
  });

  it('preserva a contagem acumulada no banco', async () => {
    await proximoNumero('pedido');
    await proximoNumero('pedido');
    await proximoNumero('pedido');

    const contador = await prisma.contador.findUnique({ where: { chave: 'pedido' } });
    expect(contador.valor).toBe(3);
  });

  it('passa de 4 dígitos sem truncar', async () => {
    await prisma.contador.create({ data: { chave: 'pedido', valor: 9999 } });
    expect(await proximoNumero('pedido')).toBe('10000');
  });
});
