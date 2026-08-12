// ======================================
// USUÁRIOS — DADOS E REGRAS
// ======================================
// Toda a rota exige perfil Administrador (usuarios.routes.js). Operador
// e Visitante recebem 403 até para listar, então a tela nem entra no
// menu deles.
//
// O servidor guarda duas travas que impedem alguém de se trancar para
// fora do próprio sistema, e as duas são repetidas aqui para explicar
// o motivo antes da tentativa:
//   1. não dá para excluir o usuário com que se está logado;
//   2. não dá para remover, desativar ou rebaixar o último
//      Administrador ativo.

import { z } from 'zod';
import { api } from '@/comum/api';

export const PERFIS = ['Administrador', 'Operador', 'Visitante'] as const;
export type Perfil = (typeof PERFIS)[number];

export const DESCRICAO_PERFIL: Record<Perfil, string> = {
  Administrador: 'Acesso total, incluindo usuários e backup',
  Operador: 'Usa o sistema no dia a dia, sem gerenciar acessos',
  Visitante: 'Somente leitura — não altera nenhum dado'
};

export type Usuario = {
  id: number;
  nome: string;
  usuario: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
};

// Na criação a senha é obrigatória; na edição, em branco significa
// "manter a atual". Por isso são dois schemas e não um com campo
// opcional: a mensagem de erro precisa ser diferente em cada caso.
const base = {
  nome: z.string().trim().min(1, 'Informe o nome.'),
  usuario: z
    .string()
    .trim()
    .min(3, 'O usuário precisa de pelo menos 3 caracteres.')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use apenas letras, números, ponto, hífen ou sublinhado.'),
  perfil: z.enum(PERFIS),
  ativo: z.boolean()
};

export const esquemaCriarUsuario = z.object({
  ...base,
  senha: z.string().min(6, 'A senha precisa de pelo menos 6 caracteres.')
});

export const esquemaEditarUsuario = z.object({
  ...base,
  senha: z
    .string()
    .refine(valor => valor === '' || valor.length >= 6, 'A senha precisa de pelo menos 6 caracteres.')
});

export type FormularioUsuario = z.input<typeof esquemaEditarUsuario>;
export type DadosUsuario = z.output<typeof esquemaEditarUsuario>;

export const chavesUsuario = { todos: ['usuarios'] as const };

export const listarUsuarios = (sinal?: AbortSignal) =>
  api.get<Usuario[]>('/usuarios', { sinal });

export function criarUsuario(dados: DadosUsuario) {
  return api.post<Usuario>('/usuarios', dados);
}

export function atualizarUsuario(id: number, dados: DadosUsuario) {
  // Senha em branco não vai no corpo: o servidor mantém a atual quando
  // o campo está ausente. Mandar "" tentaria gravar senha vazia.
  const { senha, ...resto } = dados;
  return api.put<Usuario>(`/usuarios/${id}`, senha ? dados : resto);
}

export const excluirUsuario = (id: number) => api.delete<void>(`/usuarios/${id}`);

// ─── REGRAS ─────────────────────────────────────────────

export const ehAdministradorAtivo = (u: Pick<Usuario, 'perfil' | 'ativo'>) =>
  u.perfil === 'Administrador' && u.ativo;

export const contarAdministradoresAtivos = (usuarios: Usuario[]) =>
  usuarios.filter(ehAdministradorAtivo).length;

/** É o último Administrador ativo que resta? */
export function ehUltimoAdministrador(usuario: Usuario, todos: Usuario[]) {
  return ehAdministradorAtivo(usuario) && contarAdministradoresAtivos(todos) === 1;
}

/**
 * Por que este usuário não pode ser excluído, ou null quando pode.
 * A mensagem vai para a interface; o servidor aplica a mesma regra.
 */
export function motivoNaoPodeExcluir(
  usuario: Usuario,
  todos: Usuario[],
  idLogado: number | undefined
): string | null {
  if (usuario.id === idLogado) {
    return 'Você não pode excluir o usuário com que está logado.';
  }
  if (ehUltimoAdministrador(usuario, todos)) {
    return 'É o último Administrador ativo. Sem ele ninguém conseguiria gerenciar acessos.';
  }
  return null;
}

/**
 * Por que esta edição seria recusada, ou null quando é permitida.
 * Cobre desativar ou rebaixar o último Administrador.
 */
export function motivoNaoPodeEditar(
  usuario: Usuario,
  alteracao: Pick<Usuario, 'perfil' | 'ativo'>,
  todos: Usuario[]
): string | null {
  const deixariaDeSerAdminAtivo =
    ehAdministradorAtivo(usuario) &&
    (alteracao.perfil !== 'Administrador' || alteracao.ativo === false);

  if (deixariaDeSerAdminAtivo && ehUltimoAdministrador(usuario, todos)) {
    return 'É o último Administrador ativo. Promova outro antes de alterar este.';
  }
  return null;
}
