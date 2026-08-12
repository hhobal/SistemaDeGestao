// ======================================
// AGENDA — REGRAS
// ======================================
// O ponto delicado desta tela é data: o <input type="date"> devolve
// "aaaa-mm-dd" sem fuso, e converter errado desloca o dia.

import { describe, it, expect } from 'vitest';
import { diaDoEvento, esquemaEvento, eventoJaPassou } from './api';

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
