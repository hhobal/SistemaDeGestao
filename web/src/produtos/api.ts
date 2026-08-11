// ======================================
// PRODUTOS — DADOS
// ======================================
// Espelha backend/src/controllers/produtos.controller.js.
//
// Atenção ao dinheiro, que trafega em dois formatos diferentes:
//   leitura — o Prisma serializa Decimal como string ("289.90"), para
//             não perder precisão ao virar número de ponto flutuante;
//   escrita — o schema do servidor usa z.coerce.number().
// Por isso o tipo de leitura e o de escrita não são o mesmo.

import { z } from 'zod';
import { api, query } from '../lib/api';
import type { Dinheiro, Paginado } from '../lib/tipos';

export type Produto = {
  id: number;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  preco: Dinheiro;
  custo: Dinheiro;
  estoque: number;
  estoqueMin: number;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
};

const vazioParaNulo = (valor: unknown) => (valor === '' || valor === undefined ? null : valor);

// z.coerce converte a string que todo <input> devolve. Sem isso, "10"
// falharia na validação de número e o formulário travaria sem explicar.
const naoNegativo = (rotulo: string) =>
  z.coerce.number({ message: `${rotulo} deve ser um número.` }).min(0, `${rotulo} não pode ser negativo.`);

export const esquemaProduto = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.'),
  codigo: z.preprocess(vazioParaNulo, z.string().trim().nullable()),
  categoria: z.string().trim(),
  preco: naoNegativo('Preço'),
  custo: naoNegativo('Custo'),
  estoque: z.coerce.number().int('Use um número inteiro.').min(0, 'Estoque não pode ser negativo.'),
  estoqueMin: z.coerce.number().int('Use um número inteiro.').min(0, 'Mínimo não pode ser negativo.'),
  descricao: z.string().trim(),
  ativo: z.boolean()
});

export type FormularioProduto = z.input<typeof esquemaProduto>;
export type DadosProduto = z.output<typeof esquemaProduto>;

export type FiltrosProduto = {
  busca?: string;
  categoria?: string;
  pagina?: number;
  porPagina?: number;
};

export const chavesProduto = {
  todos: ['produtos'] as const,
  lista: (filtros: FiltrosProduto) => ['produtos', 'lista', filtros] as const,
  categorias: ['produtos', 'categorias'] as const
};

export function listarProdutos(filtros: FiltrosProduto, sinal?: AbortSignal) {
  return api.get<Paginado<Produto>>(
    `/produtos${query({
      busca: filtros.busca,
      categoria: filtros.categoria,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina
    })}`,
    { sinal }
  );
}

export const listarCategorias = () => api.get<string[]>('/produtos/categorias');

export const criarProduto = (dados: DadosProduto) => api.post<Produto>('/produtos', dados);

export const atualizarProduto = (id: number, dados: DadosProduto) =>
  api.put<Produto>(`/produtos/${id}`, dados);

export const excluirProduto = (id: number) => api.delete<void>(`/produtos/${id}`);

// ─── REGRAS DE APRESENTAÇÃO ─────────────────────────────

/**
 * Margem sobre o preço de venda, em porcentagem.
 *
 * Devolve null quando não dá para calcular. O Number() explícito não é
 * decoração: preço chega como string, e "0.00" é um valor verdadeiro em
 * JavaScript — a versão anterior do painel caía nessa e dividia por zero.
 */
export function margem(produto: Pick<Produto, 'preco' | 'custo'>): number | null {
  const preco = Number(produto.preco ?? 0);
  const custo = Number(produto.custo ?? 0);
  if (preco <= 0 || custo <= 0) return null;
  return ((preco - custo) / preco) * 100;
}

export type SituacaoEstoque = 'zerado' | 'critico' | 'ok';

export function situacaoEstoque(produto: Pick<Produto, 'estoque' | 'estoqueMin'>): SituacaoEstoque {
  if (produto.estoque <= 0) return 'zerado';
  if (produto.estoqueMin > 0 && produto.estoque <= produto.estoqueMin) return 'critico';
  return 'ok';
}
