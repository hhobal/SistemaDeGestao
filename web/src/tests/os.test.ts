// ======================================
// REGRAS DE ORDEM DE SERVIÇO
// ======================================

import { describe, it, expect } from 'vitest';
import {
  consequenciaDoStatusOS,
  diasEmAberto,
  ehStatusFinalOS,
  esquemaOS,
  podeAlterarStatusOS,
  STATUS_OS
} from '../os/api';

describe('estado final', () => {
  it('trata concluída e cancelada como definitivas', () => {
    expect(ehStatusFinalOS('concluida')).toBe(true);
    expect(ehStatusFinalOS('cancelada')).toBe(true);
  });

  it('deixa aberta e em andamento editáveis', () => {
    expect(podeAlterarStatusOS({ status: 'aberta' })).toBe(true);
    expect(podeAlterarStatusOS({ status: 'andamento' })).toBe(true);
    expect(podeAlterarStatusOS({ status: 'concluida' })).toBe(false);
    expect(podeAlterarStatusOS({ status: 'cancelada' })).toBe(false);
  });
});

describe('consequenciaDoStatusOS', () => {
  it('avisa sobre a receita ao concluir com valor', () => {
    const aviso = consequenciaDoStatusOS('concluida', '450.00');
    expect(aviso).toMatch(/receita/i);
    expect(aviso).toMatch(/finanças/i);
  });

  it('explica que O.S. sem valor não gera lançamento', () => {
    // O servidor só cria receita quando valor > 0. Prometer um
    // lançamento que não vem seria pior que não avisar nada.
    const aviso = consequenciaDoStatusOS('concluida', 0);
    expect(aviso).toMatch(/nenhum lançamento/i);
  });

  it('trata o Decimal em string como número', () => {
    // A API devolve valor como string; "0" precisa contar como zero.
    expect(consequenciaDoStatusOS('concluida', '0')).toMatch(/nenhum lançamento/i);
    expect(consequenciaDoStatusOS('concluida', '0.00')).toMatch(/nenhum lançamento/i);
    expect(consequenciaDoStatusOS('concluida', '120.50')).toMatch(/receita/i);
  });

  it('avisa que cancelar não gera receita', () => {
    expect(consequenciaDoStatusOS('cancelada', '300')).toMatch(/sem gerar receita/i);
  });

  it('não pede confirmação para aberta e em andamento', () => {
    expect(consequenciaDoStatusOS('aberta', '100')).toBeNull();
    expect(consequenciaDoStatusOS('andamento', '100')).toBeNull();
  });

  it('pede confirmação exatamente nos estados finais', () => {
    const comAviso = STATUS_OS.filter(s => consequenciaDoStatusOS(s, '100') !== null);
    const finais = STATUS_OS.filter(ehStatusFinalOS);
    expect(comAviso.sort()).toEqual(finais.sort());
  });
});

describe('diasEmAberto', () => {
  it('conta os dias desde a abertura', () => {
    const dezDiasAtras = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(diasEmAberto({ status: 'aberta', dataAbertura: dezDiasAtras })).toBe(10);
  });

  it('não conta para O.S. já encerrada', () => {
    // Uma O.S. concluída não está "em aberto há 200 dias".
    const antiga = new Date(Date.now() - 200 * 86_400_000).toISOString();
    expect(diasEmAberto({ status: 'concluida', dataAbertura: antiga })).toBeNull();
    expect(diasEmAberto({ status: 'cancelada', dataAbertura: antiga })).toBeNull();
  });
});

describe('esquemaOS', () => {
  const valido = {
    titulo: 'Troca de tela',
    descricao: '',
    observacao: '',
    prioridade: 'normal' as const,
    valor: '620.00',
    clienteId: '5',
    responsavelId: ''
  };

  it('converte os textos do formulário nos tipos que a API espera', () => {
    const saida = esquemaOS.parse(valido);
    expect(saida.valor).toBe(620);
    expect(saida.clienteId).toBe(5);
  });

  it('transforma seleção vazia em null', () => {
    // O <select> devolve ""; o servidor espera null para "sem vínculo".
    const saida = esquemaOS.parse(valido);
    expect(saida.responsavelId).toBeNull();
  });

  it('recusa título vazio', () => {
    expect(esquemaOS.safeParse({ ...valido, titulo: '  ' }).success).toBe(false);
  });

  it('recusa valor negativo', () => {
    expect(esquemaOS.safeParse({ ...valido, valor: '-10' }).success).toBe(false);
  });

  it('aceita valor zero, para orçamento ainda não fechado', () => {
    expect(esquemaOS.safeParse({ ...valido, valor: '0' }).success).toBe(true);
  });

  it('recusa prioridade fora da lista', () => {
    expect(esquemaOS.safeParse({ ...valido, prioridade: 'altissima' }).success).toBe(false);
  });
});
