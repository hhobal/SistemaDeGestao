// ======================================
// REGRAS DE PEDIDO
// ======================================
// Estas regras existem em dobro: aqui, para explicar ao usuário por que
// uma ação não está disponível, e no servidor, que é quem de fato
// recusa. O teste garante que as duas descrevem a mesma coisa — uma
// interface que ofereça um caminho recusado pela API é pior que uma
// que não o ofereça.

import { describe, it, expect } from 'vitest';
import {
  consequenciaDoStatus,
  ehStatusFinal,
  podeAlterarStatus,
  podeExcluir,
  ROTULO_STATUS,
  STATUS_PEDIDO
} from './api';

describe('estado final', () => {
  it('trata entregue e cancelado como definitivos', () => {
    // O servidor recusa mudar a partir desses dois: reverter significaria
    // desfazer baixa de estoque e lançamento financeiro consolidados.
    expect(ehStatusFinal('entregue')).toBe(true);
    expect(ehStatusFinal('cancelado')).toBe(true);
  });

  it('deixa os demais em aberto', () => {
    expect(ehStatusFinal('pendente')).toBe(false);
    expect(ehStatusFinal('processando')).toBe(false);
    expect(ehStatusFinal('enviado')).toBe(false);
  });
});

describe('podeAlterarStatus', () => {
  it('permite enquanto o pedido está em andamento', () => {
    expect(podeAlterarStatus({ status: 'pendente' })).toBe(true);
    expect(podeAlterarStatus({ status: 'processando' })).toBe(true);
    expect(podeAlterarStatus({ status: 'enviado' })).toBe(true);
  });

  it('bloqueia depois de entregue ou cancelado', () => {
    expect(podeAlterarStatus({ status: 'entregue' })).toBe(false);
    expect(podeAlterarStatus({ status: 'cancelado' })).toBe(false);
  });
});

describe('podeExcluir', () => {
  it('permite apenas pedido cancelado', () => {
    expect(podeExcluir({ status: 'cancelado' })).toBe(true);
  });

  it('recusa todos os outros', () => {
    // Apagar um pedido ativo deixaria estoque debitado e receita
    // lançada sem origem. O servidor devolve 409 nesses casos.
    const outros = STATUS_PEDIDO.filter(s => s !== 'cancelado');
    for (const status of outros) {
      expect(podeExcluir({ status })).toBe(false);
    }
  });
});

describe('consequenciaDoStatus', () => {
  it('avisa que entregar marca a receita como recebida', () => {
    expect(consequenciaDoStatus('entregue')).toMatch(/receita/i);
  });

  it('avisa que cancelar devolve estoque e estorna o financeiro', () => {
    const aviso = consequenciaDoStatus('cancelado');
    expect(aviso).toMatch(/estoque/i);
    expect(aviso).toMatch(/estorn/i);
  });

  it('não pede confirmação para movimentos reversíveis', () => {
    // Mover para "em preparo" ou "enviado" não mexe em estoque nem em
    // dinheiro; exigir confirmação só atrapalharia o uso diário.
    expect(consequenciaDoStatus('pendente')).toBeNull();
    expect(consequenciaDoStatus('processando')).toBeNull();
    expect(consequenciaDoStatus('enviado')).toBeNull();
  });

  it('pede confirmação exatamente nos estados irreversíveis', () => {
    // Os dois conjuntos precisam coincidir: um estado final sem aviso
    // deixaria o usuário consolidar sem saber.
    const comAviso = STATUS_PEDIDO.filter(s => consequenciaDoStatus(s) !== null);
    const finais = STATUS_PEDIDO.filter(s => ehStatusFinal(s));
    expect(comAviso.sort()).toEqual(finais.sort());
  });
});

describe('rótulos', () => {
  it('traduz todos os status para português', () => {
    for (const status of STATUS_PEDIDO) {
      expect(ROTULO_STATUS[status]).toBeTruthy();
      expect(ROTULO_STATUS[status]).not.toBe(status);
    }
  });
});
