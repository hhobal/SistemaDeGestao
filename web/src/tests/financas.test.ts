// ======================================
// REGRAS DE FINANÇAS
// ======================================

import { describe, it, expect } from 'vitest';
import {
  ehAutomatico,
  esquemaLancamento,
  estaVencido,
  origemDoLancamento,
  podeEditar
} from '../financas/api';

describe('origem do lançamento', () => {
  it('reconhece o que veio de um pedido', () => {
    expect(origemDoLancamento({ pedidoId: 12, osId: null })).toBe('pedido');
  });

  it('reconhece o que veio de uma O.S.', () => {
    expect(origemDoLancamento({ pedidoId: null, osId: 7 })).toBe('os');
  });

  it('reconhece o lançado à mão', () => {
    expect(origemDoLancamento({ pedidoId: null, osId: null })).toBe('manual');
  });
});

describe('podeEditar', () => {
  it('permite apenas o lançamento manual', () => {
    expect(podeEditar({ pedidoId: null, osId: null })).toBe(true);
  });

  it('bloqueia o que reflete um pedido ou O.S.', () => {
    // Editar aqui faria o financeiro divergir da origem. O servidor
    // recusa com 409; a interface nem oferece o botão.
    expect(podeEditar({ pedidoId: 12, osId: null })).toBe(false);
    expect(podeEditar({ pedidoId: null, osId: 7 })).toBe(false);
    expect(ehAutomatico({ pedidoId: 12, osId: null })).toBe(true);
  });

  it('trata id zero como vínculo, não como ausência', () => {
    // Um `if (l.pedidoId)` diria "manual" para o pedido de id 0, porque
    // zero é falso em JavaScript. A comparação é com null.
    expect(podeEditar({ pedidoId: 0, osId: null })).toBe(false);
  });
});

describe('estaVencido', () => {
  const agora = new Date('2026-08-12T12:00:00Z');

  it('marca pendente com data passada', () => {
    expect(estaVencido({ status: 'pendente', data: '2026-08-01T00:00:00Z' }, agora)).toBe(true);
  });

  it('não marca pendente com data futura', () => {
    expect(estaVencido({ status: 'pendente', data: '2026-09-01T00:00:00Z' }, agora)).toBe(false);
  });

  it('nunca marca lançamento já pago', () => {
    // Uma conta paga em janeiro não está "vencida" hoje.
    expect(estaVencido({ status: 'pago', data: '2026-01-01T00:00:00Z' }, agora)).toBe(false);
  });
});

describe('esquemaLancamento', () => {
  const valido = {
    descricao: 'Aluguel',
    categoria: 'Instalações',
    tipo: 'despesa' as const,
    valor: '2400.00',
    status: 'pago' as const,
    data: '2026-08-05'
  };

  it('converte o valor digitado em número', () => {
    expect(esquemaLancamento.parse(valido).valor).toBe(2400);
  });

  it('recusa descrição vazia', () => {
    expect(esquemaLancamento.safeParse({ ...valido, descricao: '  ' }).success).toBe(false);
  });

  it('recusa valor zero', () => {
    // Lançamento de zero não representa movimento nenhum e só sujaria
    // o extrato.
    expect(esquemaLancamento.safeParse({ ...valido, valor: '0' }).success).toBe(false);
  });

  it('recusa valor negativo', () => {
    // O sinal vem do tipo (receita ou despesa), não do número.
    expect(esquemaLancamento.safeParse({ ...valido, valor: '-50' }).success).toBe(false);
  });

  it('recusa tipo fora da lista', () => {
    expect(esquemaLancamento.safeParse({ ...valido, tipo: 'transferencia' }).success).toBe(false);
  });

  it('aceita categoria vazia', () => {
    expect(esquemaLancamento.safeParse({ ...valido, categoria: '' }).success).toBe(true);
  });
});
