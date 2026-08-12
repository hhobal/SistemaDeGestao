// ======================================
// CADASTROS SIMPLES — REGRAS
// ======================================
// O ponto delicado destas telas é data: o <input type="date"> devolve
// "aaaa-mm-dd" sem fuso, e converter errado desloca o dia.

import { describe, it, expect } from 'vitest';
import {
  diaDoEvento,
  esquemaEvento,
  esquemaFornecedor,
  esquemaNota,
  esquemaTarefa,
  eventoJaPassou,
  tarefaAtrasada
} from '../cadastros/api';

describe('diaDoEvento', () => {
  it('extrai a data sem converter fuso', () => {
    // new Date(iso).getDate() devolveria o dia anterior no Brasil para
    // horários próximos da meia-noite UTC.
    expect(diaDoEvento('2026-08-12T00:00:00.000Z')).toBe('2026-08-12');
    expect(diaDoEvento('2026-08-12T23:30:00.000Z')).toBe('2026-08-12');
  });
});

describe('eventoJaPassou', () => {
  const hoje = new Date('2026-08-12T15:00:00Z');

  it('reconhece evento de ontem', () => {
    expect(eventoJaPassou({ data: '2026-08-11T12:00:00Z' }, hoje)).toBe(true);
  });

  it('não considera o evento de hoje como passado', () => {
    // Compromisso das 18h continua valendo às 15h.
    expect(eventoJaPassou({ data: '2026-08-12T09:00:00Z' }, hoje)).toBe(false);
  });

  it('reconhece evento futuro', () => {
    expect(eventoJaPassou({ data: '2026-08-20T12:00:00Z' }, hoje)).toBe(false);
  });
});

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

describe('esquemaFornecedor', () => {
  const valido = {
    empresa: 'Nexus',
    contato: '',
    telefone: '',
    email: '',
    cnpj: '',
    categoria: ''
  };

  it('exige a empresa', () => {
    expect(esquemaFornecedor.safeParse({ ...valido, empresa: ' ' }).success).toBe(false);
  });

  it('aceita e-mail em branco', () => {
    // O servidor trata o campo como opcional; exigir formato num campo
    // vazio bloquearia cadastro legítimo.
    expect(esquemaFornecedor.safeParse(valido).success).toBe(true);
  });

  it('valida o formato quando o e-mail é preenchido', () => {
    expect(esquemaFornecedor.safeParse({ ...valido, email: 'nao-e-email' }).success).toBe(false);
    expect(esquemaFornecedor.safeParse({ ...valido, email: 'a@b.com' }).success).toBe(true);
  });
});

describe('esquemaEvento', () => {
  const valido = { titulo: 'Reunião', data: '2026-08-20', hora: '', descricao: '', tipo: 'reuniao' as const };

  it('exige título e data', () => {
    expect(esquemaEvento.safeParse({ ...valido, titulo: '' }).success).toBe(false);
    expect(esquemaEvento.safeParse({ ...valido, data: '' }).success).toBe(false);
  });

  it('recusa tipo fora da lista', () => {
    expect(esquemaEvento.safeParse({ ...valido, tipo: 'aniversario' }).success).toBe(false);
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

describe('esquemaNota', () => {
  it('exige título', () => {
    expect(esquemaNota.safeParse({ titulo: '', conteudo: 'x', cor: '#1e2430' }).success).toBe(false);
  });

  it('aceita conteúdo vazio', () => {
    expect(esquemaNota.safeParse({ titulo: 'Lembrete', conteudo: '', cor: '#1e2430' }).success).toBe(true);
  });
});
