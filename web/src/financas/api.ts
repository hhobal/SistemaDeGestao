// ======================================
// FINANÇAS — DADOS E REGRAS
// ======================================
// É onde tudo desemboca: venda na loja e O.S. concluída viram
// lançamento aqui, criados pelo servidor dentro da mesma transação da
// operação de origem.
//
// A consequência disso vira a regra central desta tela: um lançamento
// com pedidoId ou osId é reflexo de outra coisa, não um registro
// independente. Editá-lo faria o financeiro divergir da origem, então
// o servidor recusa (409) — e aqui a interface nem oferece.

import { z } from 'zod';
import { api, query } from '../lib/api';
import type { Dinheiro, Paginado } from '../lib/tipos';

export const TIPOS = ['receita', 'despesa'] as const;
export type TipoLancamento = (typeof TIPOS)[number];

export const STATUS_LANCAMENTO = ['pago', 'pendente'] as const;
export type StatusLancamento = (typeof STATUS_LANCAMENTO)[number];

export type Lancamento = {
  id: number;
  descricao: string;
  categoria: string | null;
  tipo: TipoLancamento;
  valor: Dinheiro;
  status: StatusLancamento;
  data: string;
  pedidoId: number | null;
  osId: number | null;
};

export type ResumoFinanceiro = {
  receita: Dinheiro;
  despesa: Dinheiro;
  saldo: Dinheiro;
  pendentes: number;
};

export type PontoMensal = { mes: string; total: Dinheiro };

export const esquemaLancamento = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição.'),
  categoria: z.string().trim(),
  tipo: z.enum(TIPOS),
  valor: z.coerce
    .number({ message: 'Valor deve ser um número.' })
    .positive('O valor precisa ser maior que zero.'),
  status: z.enum(STATUS_LANCAMENTO),
  // <input type="date"> devolve "aaaa-mm-dd"; vazio significa "hoje".
  data: z.string()
});

export type FormularioLancamento = z.input<typeof esquemaLancamento>;
export type DadosLancamento = z.output<typeof esquemaLancamento>;

export type FiltrosFinancas = {
  busca?: string;
  tipo?: TipoLancamento | '';
  status?: StatusLancamento | '';
  pagina?: number;
  porPagina?: number;
};

export const chavesFinancas = {
  todas: ['financas'] as const,
  lista: (f: FiltrosFinancas) => ['financas', 'lista', f] as const,
  // O resumo entra na chave com os filtros de propósito: ele responde
  // aos mesmos parâmetros da listagem, e ignorar isso reproduziria o
  // bug da versão antiga, onde os cards somavam tudo enquanto a tabela
  // mostrava um recorte.
  resumo: (f: FiltrosFinancas) => ['financas', 'resumo', f] as const,
  mensal: ['financas', 'mensal'] as const
};

function parametros(f: FiltrosFinancas) {
  return query({
    busca: f.busca,
    tipo: f.tipo,
    status: f.status,
    pagina: f.pagina,
    porPagina: f.porPagina
  });
}

export const listarLancamentos = (f: FiltrosFinancas, sinal?: AbortSignal) =>
  api.get<Paginado<Lancamento>>(`/financas/lancamentos${parametros(f)}`, { sinal });

export const obterResumo = (f: FiltrosFinancas, sinal?: AbortSignal) =>
  api.get<ResumoFinanceiro>(`/financas/resumo${parametros(f)}`, { sinal });

export const obterMensal = () => api.get<PontoMensal[]>('/financas/mensal');

export const criarLancamento = (dados: DadosLancamento) =>
  api.post<Lancamento>('/financas/lancamentos', dados);

export const atualizarLancamento = (id: number, dados: DadosLancamento) =>
  api.put<Lancamento>(`/financas/lancamentos/${id}`, dados);

export const alterarStatusLancamento = (id: number, status: StatusLancamento) =>
  api.patch<Lancamento>(`/financas/lancamentos/${id}/status`, { status });

export const excluirLancamento = (id: number) =>
  api.delete<void>(`/financas/lancamentos/${id}`);

// ─── REGRAS ─────────────────────────────────────────────

/** Origem do lançamento: criado à mão ou reflexo de um pedido/O.S. */
export type Origem = 'manual' | 'pedido' | 'os';

export function origemDoLancamento(l: Pick<Lancamento, 'pedidoId' | 'osId'>): Origem {
  if (l.pedidoId !== null) return 'pedido';
  if (l.osId !== null) return 'os';
  return 'manual';
}

export const ehAutomatico = (l: Pick<Lancamento, 'pedidoId' | 'osId'>) =>
  origemDoLancamento(l) !== 'manual';

/**
 * Só lançamento manual pode ser editado ou excluído. Os automáticos são
 * consequência de um pedido ou de uma O.S.; para desfazê-los, cancela-se
 * a origem — que estorna tudo de uma vez, dentro de uma transação.
 */
export const podeEditar = (l: Pick<Lancamento, 'pedidoId' | 'osId'>) => !ehAutomatico(l);

export const MOTIVO_BLOQUEIO =
  'Este lançamento foi gerado automaticamente por um pedido ou O.S. Para desfazê-lo, cancele a origem.';

/** Vencido = pendente com data no passado. */
export function estaVencido(l: Pick<Lancamento, 'status' | 'data'>, agora = new Date()) {
  if (l.status !== 'pendente') return false;
  return new Date(l.data).getTime() < agora.getTime();
}
