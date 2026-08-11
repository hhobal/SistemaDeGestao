// ======================================
// REGRAS DE PRODUTO
// ======================================
// Funções puras, testadas sem DOM. A margem em especial: era um bug
// real no painel anterior, que tratava o preço como número quando ele
// chega da API como string.

import { describe, it, expect } from 'vitest';
import { margem, situacaoEstoque, esquemaProduto } from '../produtos/api';

describe('margem', () => {
  it('calcula sobre o preço de venda', () => {
    // 100 de venda, 40 de custo → 60% de margem.
    expect(margem({ preco: 100, custo: 40 })).toBeCloseTo(60);
  });

  it('funciona com o Decimal em string que a API devolve', () => {
    expect(margem({ preco: '289.90', custo: '168.00' })).toBeCloseTo(42.05, 1);
  });

  it('devolve null quando o preço é zero', () => {
    // O painel antigo usava `p.preco && p.custo`. Com Decimal virando
    // string, "0.00" é verdadeiro em JavaScript e a conta dividia por
    // zero, exibindo "Infinity% margem".
    expect(margem({ preco: '0.00', custo: '10.00' })).toBeNull();
    expect(margem({ preco: 0, custo: 10 })).toBeNull();
  });

  it('devolve null quando não há custo cadastrado', () => {
    expect(margem({ preco: '100.00', custo: '0.00' })).toBeNull();
  });

  it('devolve margem negativa quando o custo supera o preço', () => {
    const resultado = margem({ preco: 50, custo: 80 });
    expect(resultado).not.toBeNull();
    expect(resultado!).toBeLessThan(0);
  });
});

describe('situacaoEstoque', () => {
  it('marca como zerado quando não há unidades', () => {
    expect(situacaoEstoque({ estoque: 0, estoqueMin: 5 })).toBe('zerado');
  });

  it('marca como crítico ao atingir o mínimo', () => {
    expect(situacaoEstoque({ estoque: 5, estoqueMin: 5 })).toBe('critico');
    expect(situacaoEstoque({ estoque: 3, estoqueMin: 5 })).toBe('critico');
  });

  it('não alerta quando o mínimo não foi definido', () => {
    // Mínimo zero significa "não acompanho este item", e não
    // "está sempre crítico".
    expect(situacaoEstoque({ estoque: 1, estoqueMin: 0 })).toBe('ok');
  });

  it('fica ok acima do mínimo', () => {
    expect(situacaoEstoque({ estoque: 10, estoqueMin: 5 })).toBe('ok');
  });
});

describe('esquemaProduto', () => {
  const valido = {
    nome: 'Teclado',
    codigo: 'TEC-001',
    categoria: 'Periféricos',
    preco: '289.90',
    custo: '168.00',
    estoque: '24',
    estoqueMin: '8',
    descricao: '',
    ativo: true
  };

  it('converte os textos do formulário em números', () => {
    // Todo <input> devolve string; o servidor espera número.
    const saida = esquemaProduto.parse(valido);
    expect(saida.preco).toBe(289.9);
    expect(saida.estoque).toBe(24);
    expect(typeof saida.preco).toBe('number');
    expect(typeof saida.estoque).toBe('number');
  });

  it('transforma código vazio em null', () => {
    // A coluna é única no banco: duas strings vazias colidiriam.
    const saida = esquemaProduto.parse({ ...valido, codigo: '' });
    expect(saida.codigo).toBeNull();
  });

  it('recusa nome vazio', () => {
    const resultado = esquemaProduto.safeParse({ ...valido, nome: '   ' });
    expect(resultado.success).toBe(false);
  });

  it('recusa preço negativo', () => {
    const resultado = esquemaProduto.safeParse({ ...valido, preco: '-1' });
    expect(resultado.success).toBe(false);
  });

  it('recusa estoque fracionado', () => {
    const resultado = esquemaProduto.safeParse({ ...valido, estoque: '2.5' });
    expect(resultado.success).toBe(false);
  });

  it('aceita preço zero, que é válido para item sem venda', () => {
    expect(esquemaProduto.safeParse({ ...valido, preco: '0' }).success).toBe(true);
  });
});
