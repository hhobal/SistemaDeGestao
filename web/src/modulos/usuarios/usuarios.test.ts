// ======================================
// REGRAS DE USUÁRIOS
// ======================================
// As duas travas testadas aqui impedem alguém de se trancar para fora
// do próprio sistema. O servidor as aplica; estas funções servem para
// explicar o motivo antes da tentativa.

import { describe, it, expect } from 'vitest';
import {
  contarAdministradoresAtivos,
  ehUltimoAdministrador,
  esquemaCriarUsuario,
  esquemaEditarUsuario,
  motivoNaoPodeEditar,
  motivoNaoPodeExcluir,
  type Usuario
} from './api';

const criar = (id: number, perfil: Usuario['perfil'], ativo = true): Usuario => ({
  id,
  nome: `Usuário ${id}`,
  usuario: `user${id}`,
  perfil,
  ativo,
  criadoEm: '2026-01-01T00:00:00Z'
});

const ADMIN = criar(1, 'Administrador');
const OUTRO_ADMIN = criar(2, 'Administrador');
const ADMIN_INATIVO = criar(3, 'Administrador', false);
const OPERADOR = criar(4, 'Operador');

describe('contagem de administradores', () => {
  it('conta apenas os ativos', () => {
    // Um administrador desativado não consegue entrar, então não conta
    // como garantia de acesso.
    expect(contarAdministradoresAtivos([ADMIN, ADMIN_INATIVO, OPERADOR])).toBe(1);
    expect(contarAdministradoresAtivos([ADMIN, OUTRO_ADMIN])).toBe(2);
  });
});

describe('motivoNaoPodeExcluir', () => {
  it('impede excluir o próprio usuário logado', () => {
    const motivo = motivoNaoPodeExcluir(ADMIN, [ADMIN, OUTRO_ADMIN], ADMIN.id);
    expect(motivo).toMatch(/logado/i);
  });

  it('impede excluir o último Administrador ativo', () => {
    const motivo = motivoNaoPodeExcluir(ADMIN, [ADMIN, OPERADOR], 99);
    expect(motivo).toMatch(/último administrador/i);
  });

  it('permite excluir um Administrador quando há outro ativo', () => {
    expect(motivoNaoPodeExcluir(ADMIN, [ADMIN, OUTRO_ADMIN], 99)).toBeNull();
  });

  it('não considera administrador inativo como reserva', () => {
    // Restam ADMIN (ativo) e ADMIN_INATIVO. Excluir o ativo deixaria o
    // sistema sem ninguém capaz de entrar e gerenciar acessos.
    expect(motivoNaoPodeExcluir(ADMIN, [ADMIN, ADMIN_INATIVO], 99)).toMatch(/último/i);
  });

  it('permite excluir operador livremente', () => {
    expect(motivoNaoPodeExcluir(OPERADOR, [ADMIN, OPERADOR], 99)).toBeNull();
  });
});

describe('motivoNaoPodeEditar', () => {
  const sozinho = [ADMIN, OPERADOR];

  it('impede rebaixar o último Administrador', () => {
    const motivo = motivoNaoPodeEditar(ADMIN, { perfil: 'Operador', ativo: true }, sozinho);
    expect(motivo).toMatch(/último administrador/i);
  });

  it('impede desativar o último Administrador', () => {
    const motivo = motivoNaoPodeEditar(ADMIN, { perfil: 'Administrador', ativo: false }, sozinho);
    expect(motivo).toMatch(/último administrador/i);
  });

  it('permite editar o último Administrador sem mexer em perfil nem situação', () => {
    // Trocar o nome ou a senha continua liberado.
    expect(
      motivoNaoPodeEditar(ADMIN, { perfil: 'Administrador', ativo: true }, sozinho)
    ).toBeNull();
  });

  it('permite rebaixar quando existe outro Administrador ativo', () => {
    expect(
      motivoNaoPodeEditar(ADMIN, { perfil: 'Operador', ativo: true }, [ADMIN, OUTRO_ADMIN])
    ).toBeNull();
  });

  it('não restringe quem não é administrador', () => {
    expect(motivoNaoPodeEditar(OPERADOR, { perfil: 'Visitante', ativo: false }, sozinho)).toBeNull();
  });
});

describe('ehUltimoAdministrador', () => {
  it('é falso para administrador inativo', () => {
    expect(ehUltimoAdministrador(ADMIN_INATIVO, [ADMIN_INATIVO, OPERADOR])).toBe(false);
  });
});

describe('schemas', () => {
  const base = { nome: 'Ana', usuario: 'ana.silva', perfil: 'Operador' as const, ativo: true };

  it('exige senha ao criar', () => {
    expect(esquemaCriarUsuario.safeParse({ ...base, senha: '' }).success).toBe(false);
    expect(esquemaCriarUsuario.safeParse({ ...base, senha: '12345' }).success).toBe(false);
    expect(esquemaCriarUsuario.safeParse({ ...base, senha: '123456' }).success).toBe(true);
  });

  it('aceita senha em branco ao editar, mantendo a atual', () => {
    expect(esquemaEditarUsuario.safeParse({ ...base, senha: '' }).success).toBe(true);
  });

  it('ainda exige tamanho mínimo quando a senha é preenchida na edição', () => {
    expect(esquemaEditarUsuario.safeParse({ ...base, senha: '123' }).success).toBe(false);
  });

  it('recusa login com espaço ou acento', () => {
    // O login vai na URL e em comparações exatas; caracteres especiais
    // só criam confusão.
    expect(esquemaCriarUsuario.safeParse({ ...base, usuario: 'ana silva', senha: '123456' }).success).toBe(false);
    expect(esquemaCriarUsuario.safeParse({ ...base, usuario: 'josé', senha: '123456' }).success).toBe(false);
  });

  it('aceita ponto, hífen e sublinhado no login', () => {
    for (const login of ['ana.silva', 'ana-silva', 'ana_silva', 'ana123']) {
      expect(esquemaCriarUsuario.safeParse({ ...base, usuario: login, senha: '123456' }).success).toBe(true);
    }
  });

  it('exige pelo menos 3 caracteres no login', () => {
    expect(esquemaCriarUsuario.safeParse({ ...base, usuario: 'ab', senha: '123456' }).success).toBe(false);
  });
});
