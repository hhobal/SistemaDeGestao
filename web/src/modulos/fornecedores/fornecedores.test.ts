// ======================================
// FORNECEDORES — REGRAS
// ======================================

import { describe, it, expect } from 'vitest';
import { esquemaFornecedor } from './api';

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
