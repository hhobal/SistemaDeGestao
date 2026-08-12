// ======================================
// PEDIDOS — DADOS E REGRAS
// ======================================
// Diferente dos cadastros, aqui a interface não decide quase nada: quem
// devolve estoque, marca receita como paga e estorna lançamento é o
// servidor (backend/src/services/pedidos.service.js), dentro de uma
// transação.
//
// O que existe deste lado são as mesmas regras, só que para explicar ao
// usuário por que um botão está desabilitado antes de ele tentar. A
// checagem que vale continua sendo a de lá.

import { api, query } from '@/comum/api';
import type { Dinheiro, Paginado } from '@/comum/tipos';

export const STATUS_PEDIDO = [
  'pendente',
  'processando',
  'enviado',
  'entregue',
  'cancelado'
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

/**
 * Depois de entregue ou cancelado o pedido não muda mais de estado.
 * Permitir a troca significaria desfazer baixa de estoque e lançamento
 * financeiro já consolidados.
 */
const STATUS_FINAIS: StatusPedido[] = ['entregue', 'cancelado'];

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  processando: 'Em preparo',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado'
};

export const ROTULO_PAGAMENTO: Record<string, string> = {
  cartao: 'Cartão de crédito',
  pix: 'PIX',
  boleto: 'Boleto'
};

export type ItemPedido = {
  id: number;
  produtoId: number;
  nome: string;
  precoUnitario: Dinheiro;
  quantidade: number;
  subtotal: Dinheiro;
};

export type Pedido = {
  id: number;
  numero: string;
  clienteId: number;
  cliente?: { id: number; nome: string; email: string | null; telefone: string | null };
  enderecoEntrega: string | null;
  total: Dinheiro;
  pagamento: string;
  parcelas: number;
  status: StatusPedido;
  data: string;
  itens: ItemPedido[];
};

/** O detalhe traz custo e lucro, que a listagem não calcula. */
export type PedidoDetalhado = Pedido & {
  custoTotal: Dinheiro;
  lucroBruto: Dinheiro;
};

export type ResumoPedidos = {
  pendentes: number;
  processando: number;
  enviados: number;
  faturado: Dinheiro;
};

export type FiltrosPedido = {
  busca?: string;
  status?: StatusPedido | '';
  pagina?: number;
  porPagina?: number;
};

export const chavesPedido = {
  todos: ['pedidos'] as const,
  lista: (filtros: FiltrosPedido) => ['pedidos', 'lista', filtros] as const,
  resumo: ['pedidos', 'resumo'] as const,
  detalhe: (id: number) => ['pedidos', 'detalhe', id] as const
};

export function listarPedidos(filtros: FiltrosPedido, sinal?: AbortSignal) {
  return api.get<Paginado<Pedido>>(
    `/pedidos${query({
      busca: filtros.busca,
      status: filtros.status,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina
    })}`,
    { sinal }
  );
}

export const obterResumoPedidos = () => api.get<ResumoPedidos>('/pedidos/resumo');

export const obterPedido = (id: number) => api.get<PedidoDetalhado>(`/pedidos/${id}`);

export const alterarStatusPedido = (id: number, status: StatusPedido) =>
  api.patch<Pedido>(`/pedidos/${id}/status`, { status });

export const excluirPedido = (id: number) => api.delete<void>(`/pedidos/${id}`);

// ─── REGRAS ─────────────────────────────────────────────

export const ehStatusFinal = (status: StatusPedido) => STATUS_FINAIS.includes(status);

/** Um pedido em estado final não aceita mais mudança de status. */
export const podeAlterarStatus = (pedido: Pick<Pedido, 'status'>) => !ehStatusFinal(pedido.status);

/**
 * Só pedido cancelado pode ser excluído. Apagar um pedido ativo deixaria
 * o estoque debitado e a receita lançada sem origem — por isso o
 * servidor recusa, e aqui o botão nem aparece habilitado.
 */
export const podeExcluir = (pedido: Pick<Pedido, 'status'>) => pedido.status === 'cancelado';

/**
 * O que muda no sistema ao mover para cada status. Serve de confirmação
 * antes de agir: a operação mexe em estoque e financeiro, e não tem
 * botão de desfazer.
 */
export function consequenciaDoStatus(status: StatusPedido): string | null {
  switch (status) {
    case 'entregue':
      return 'A receita deste pedido passa a constar como recebida no financeiro. Depois disso o status não pode mais mudar.';
    case 'cancelado':
      return 'O estoque dos itens volta para o catálogo e os lançamentos financeiros são estornados. Depois disso o status não pode mais mudar.';
    default:
      return null;
  }
}
