// ======================================
// ESTOQUE — DADOS E REGRAS
// ======================================
// Diferente dos cadastros, aqui não se edita o saldo: registra-se o
// movimento, e o saldo é consequência. O servidor faz as duas coisas
// na mesma transação (estoque.controller.js), então nunca existe uma
// entrada sem a atualização correspondente.
//
// Vender pela loja também gera movimento, com motivo "Pedido #NNNN" —
// por isso o histórico mostra a origem de cada baixa.

import { z } from 'zod';
import { api, query } from '@/comum/api';
import type { Dinheiro, Paginado } from '@/comum/tipos';

export const TIPOS_MOVIMENTO = ['entrada', 'saida'] as const;
export type TipoMovimento = (typeof TIPOS_MOVIMENTO)[number];

export type Movimento = {
  id: number;
  produtoId: number;
  produto: { id: number; nome: string; codigo: string | null } | null;
  tipo: TipoMovimento;
  quantidade: number;
  motivo: string | null;
  responsavel: string | null;
  data: string;
};

export type ResumoEstoque = {
  totalProdutos: number;
  valorTotalEstoque: Dinheiro;
  criticos: number;
  zerados: number;
};

export type ProdutoCritico = {
  id: number;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  estoque: number;
  estoqueMin: number;
};

export const esquemaMovimento = z.object({
  produtoId: z.coerce.number({ message: 'Escolha o produto.' }).int().positive('Escolha o produto.'),
  tipo: z.enum(TIPOS_MOVIMENTO),
  quantidade: z.coerce
    .number({ message: 'Quantidade deve ser um número.' })
    .int('Use um número inteiro.')
    .positive('A quantidade precisa ser maior que zero.'),
  motivo: z.string().trim()
});

export type FormularioMovimento = z.input<typeof esquemaMovimento>;
export type DadosMovimento = z.output<typeof esquemaMovimento>;

export const chavesEstoque = {
  todas: ['estoque'] as const,
  resumo: ['estoque', 'resumo'] as const,
  criticos: ['estoque', 'criticos'] as const,
  movimentos: (pagina: number) => ['estoque', 'movimentos', pagina] as const
};

export const obterResumoEstoque = () => api.get<ResumoEstoque>('/estoque/resumo');

export const listarCriticos = () => api.get<ProdutoCritico[]>('/estoque/criticos');

export const listarMovimentos = (pagina: number, sinal?: AbortSignal) =>
  api.get<Paginado<Movimento>>(`/estoque/movimentos${query({ pagina, porPagina: 20 })}`, { sinal });

export const registrarMovimento = (dados: DadosMovimento) =>
  api.post<Movimento>('/estoque/movimentos', dados);

// ─── REGRAS ─────────────────────────────────────────────

/**
 * De onde veio o movimento. O servidor grava o motivo como
 * "Pedido #0123" ou "Devolução — Pedido cancelado #0123" quando a
 * origem é a loja; o resto é ajuste feito à mão no painel.
 */
export function origemDoMovimento(m: Pick<Movimento, 'motivo'>): 'pedido' | 'manual' {
  // Os dois formatos gravados pelo servidor têm palavras diferentes
  // entre "Pedido" e o número:
  //   "Pedido #0123"
  //   "Devolução — Pedido cancelado #0123"
  // Exigir o # logo depois deixaria a devolução de fora.
  return /pedido\b[^#]*#/i.test(m.motivo ?? '') ? 'pedido' : 'manual';
}

/**
 * Uma saída maior que o saldo deixaria o estoque negativo. O servidor
 * recusa com 409; aqui o aviso aparece antes de enviar.
 */
export function validarSaida(
  tipo: TipoMovimento,
  quantidade: number,
  estoqueAtual: number
): string | null {
  if (tipo !== 'saida') return null;
  if (quantidade > estoqueAtual) {
    return `Saída de ${quantidade} maior que o estoque atual (${estoqueAtual}).`;
  }
  return null;
}
