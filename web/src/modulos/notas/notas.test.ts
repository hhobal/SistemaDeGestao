// ======================================
// NOTAS — REGRAS
// ======================================

import { describe, it, expect } from 'vitest';
import { esquemaNota } from './api';

describe('esquemaNota', () => {
  it('exige título', () => {
    expect(esquemaNota.safeParse({ titulo: '', conteudo: 'x', cor: '#1e2430' }).success).toBe(false);
  });

  it('aceita conteúdo vazio', () => {
    expect(esquemaNota.safeParse({ titulo: 'Lembrete', conteudo: '', cor: '#1e2430' }).success).toBe(true);
  });
});
