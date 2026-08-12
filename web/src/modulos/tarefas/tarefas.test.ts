// ======================================
// TAREFAS — REGRAS
// ======================================

import { describe, it, expect } from 'vitest';
import { esquemaTarefa, tarefaAtrasada } from './api';

describe('tarefaAtrasada', () => {
  const hoje = new Date('2026-08-12T15:00:00Z');

  it('marca prazo vencido em tarefa aberta', () => {
    expect(
      tarefaAtrasada({ status: 'andamento', dataLimite: '2026-08-01T00:00:00Z' }, hoje)
    ).toBe(true);
  });

  it('nunca marca tarefa concluída', () => {
    // Entregue com atraso continua entregue; alertar não ajuda em nada.
    expect(
      tarefaAtrasada({ status: 'concluido', dataLimite: '2026-01-01T00:00:00Z' }, hoje)
    ).toBe(false);
  });

  it('não marca tarefa sem prazo', () => {
    expect(tarefaAtrasada({ status: 'backlog', dataLimite: null }, hoje)).toBe(false);
  });

  it('não marca prazo de hoje', () => {
    expect(
      tarefaAtrasada({ status: 'backlog', dataLimite: '2026-08-12T00:00:00Z' }, hoje)
    ).toBe(false);
  });
});

describe('esquemaTarefa', () => {
  const valido = {
    titulo: 'Cotar SSD',
    descricao: '',
    prioridade: 'alta' as const,
    status: 'backlog' as const,
    dataLimite: ''
  };

  it('aceita prazo em branco', () => {
    expect(esquemaTarefa.safeParse(valido).success).toBe(true);
  });

  it('recusa coluna inexistente', () => {
    expect(esquemaTarefa.safeParse({ ...valido, status: 'arquivado' }).success).toBe(false);
  });

  it('recusa prioridade inexistente', () => {
    expect(esquemaTarefa.safeParse({ ...valido, prioridade: 'urgente' }).success).toBe(false);
  });
});
