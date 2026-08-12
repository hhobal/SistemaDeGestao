// ======================================
// REGRAS DE ESTOQUE
// ======================================

import { describe, it, expect } from 'vitest';
import { esquemaMovimento, origemDoMovimento, validarSaida } from './api';

describe('origemDoMovimento', () => {
  it('reconhece a baixa gerada por um pedido da loja', () => {
    // O servidor grava exatamente este formato em pedidos.service.js.
    expect(origemDoMovimento({ motivo: 'Pedido #0123' })).toBe('pedido');
  });

  it('reconhece a devolução de pedido cancelado', () => {
    expect(origemDoMovimento({ motivo: 'Devolução — Pedido cancelado #0123' })).toBe('pedido');
  });

  it('trata o resto como ajuste manual', () => {
    expect(origemDoMovimento({ motivo: 'Compra do fornecedor Nexus' })).toBe('manual');
    expect(origemDoMovimento({ motivo: 'Entrada manual' })).toBe('manual');
    expect(origemDoMovimento({ motivo: null })).toBe('manual');
  });
});

describe('validarSaida', () => {
  it('avisa quando a saída passa do estoque', () => {
    expect(validarSaida('saida', 10, 3)).toMatch(/maior que o estoque/i);
  });

  it('permite retirar exatamente o que existe', () => {
    expect(validarSaida('saida', 3, 3)).toBeNull();
  });

  it('não limita entrada', () => {
    // Entrada aumenta o saldo; não há teto.
    expect(validarSaida('entrada', 1000, 0)).toBeNull();
  });
});

describe('esquemaMovimento', () => {
  const valido = { produtoId: '5', tipo: 'entrada' as const, quantidade: '10', motivo: 'Compra' };

  it('converte os textos do formulário em números', () => {
    const saida = esquemaMovimento.parse(valido);
    expect(saida.produtoId).toBe(5);
    expect(saida.quantidade).toBe(10);
  });

  it('exige que um produto seja escolhido', () => {
    // O select começa vazio; enviar sem escolher não pode passar.
    expect(esquemaMovimento.safeParse({ ...valido, produtoId: '' }).success).toBe(false);
  });

  it('recusa quantidade zero', () => {
    // Movimento de zero não altera nada e só sujaria o histórico.
    expect(esquemaMovimento.safeParse({ ...valido, quantidade: '0' }).success).toBe(false);
  });

  it('recusa quantidade negativa', () => {
    // O sentido vem do tipo (entrada ou saída), não do sinal.
    expect(esquemaMovimento.safeParse({ ...valido, quantidade: '-5' }).success).toBe(false);
  });

  it('recusa quantidade fracionada', () => {
    expect(esquemaMovimento.safeParse({ ...valido, quantidade: '2.5' }).success).toBe(false);
  });

  it('aceita motivo vazio', () => {
    expect(esquemaMovimento.safeParse({ ...valido, motivo: '' }).success).toBe(true);
  });
});
