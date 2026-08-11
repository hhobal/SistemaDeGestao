// ======================================
// ORDENS DE SERVIÇO — DADOS E REGRAS
// ======================================
// Junta as duas naturezas vistas até aqui: é um cadastro completo, como
// Clientes, e tem transição de status com efeito no financeiro, como
// Pedidos.
//
// Concluir uma O.S. com valor gera automaticamente uma receita paga
// vinculada a ela (backend/src/services/os.service.js). Isso corrige um
// buraco da versão antiga, onde concluir só mexia num card da própria
// tela e o financeiro ficava incompleto.

import { z } from 'zod';
import { api, query } from '../lib/api';
import type { Dinheiro, Paginado } from '../lib/tipos';

export const STATUS_OS = ['aberta', 'andamento', 'concluida', 'cancelada'] as const;
export type StatusOS = (typeof STATUS_OS)[number];

const STATUS_FINAIS: StatusOS[] = ['concluida', 'cancelada'];

export const PRIORIDADES = ['baixa', 'normal', 'alta', 'urgente'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const ROTULO_STATUS_OS: Record<StatusOS, string> = {
  aberta: 'Aberta',
  andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
};

export const ROTULO_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente'
};

type Referencia = { id: number; nome: string } | null;

export type OrdemServico = {
  id: number;
  numero: string;
  titulo: string;
  descricao: string | null;
  observacao: string | null;
  status: StatusOS;
  prioridade: Prioridade;
  valor: Dinheiro;
  clienteId: number | null;
  cliente: Referencia;
  responsavelId: number | null;
  responsavel: Referencia;
  dataAbertura: string;
  dataConclusao: string | null;
};

export type ResumoOS = {
  abertas: number;
  andamento: number;
  concluidas: number;
  faturado: Dinheiro;
};

// Select vazio devolve ""; o servidor espera null ou um id numérico.
const selecaoOpcional = z.preprocess(
  valor => (valor === '' || valor === undefined || valor === null ? null : Number(valor)),
  z.number().int().positive().nullable()
);

export const esquemaOS = z.object({
  titulo: z.string().trim().min(1, 'Informe o título.'),
  descricao: z.string().trim(),
  observacao: z.string().trim(),
  prioridade: z.enum(PRIORIDADES),
  valor: z.coerce.number({ message: 'Valor deve ser um número.' }).min(0, 'Valor não pode ser negativo.'),
  clienteId: selecaoOpcional,
  responsavelId: selecaoOpcional
});

export type FormularioOS = z.input<typeof esquemaOS>;
export type DadosOS = z.output<typeof esquemaOS>;

export type FiltrosOS = {
  busca?: string;
  status?: StatusOS | '';
  pagina?: number;
  porPagina?: number;
};

export const chavesOS = {
  todas: ['os'] as const,
  lista: (filtros: FiltrosOS) => ['os', 'lista', filtros] as const,
  resumo: ['os', 'resumo'] as const
};

export function listarOS(filtros: FiltrosOS, sinal?: AbortSignal) {
  return api.get<Paginado<OrdemServico>>(
    `/os${query({
      busca: filtros.busca,
      status: filtros.status,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina
    })}`,
    { sinal }
  );
}

export const obterResumoOS = () => api.get<ResumoOS>('/os/resumo');
export const criarOS = (dados: DadosOS) => api.post<OrdemServico>('/os', dados);
export const atualizarOS = (id: number, dados: DadosOS) => api.put<OrdemServico>(`/os/${id}`, dados);
export const alterarStatusOS = (id: number, status: StatusOS) =>
  api.patch<OrdemServico>(`/os/${id}/status`, { status });
export const excluirOS = (id: number) => api.delete<void>(`/os/${id}`);

// ─── REGRAS ─────────────────────────────────────────────

export const ehStatusFinalOS = (status: StatusOS) => STATUS_FINAIS.includes(status);

export const podeAlterarStatusOS = (os: Pick<OrdemServico, 'status'>) => !ehStatusFinalOS(os.status);

/**
 * Aviso do que a mudança provoca fora desta tela. Só os estados finais
 * têm efeito colateral, e por isso só eles pedem confirmação.
 */
export function consequenciaDoStatusOS(status: StatusOS, valor: Dinheiro): string | null {
  const temValor = Number(valor ?? 0) > 0;

  switch (status) {
    case 'concluida':
      return temValor
        ? 'Uma receita paga com este valor será lançada em Finanças, vinculada à O.S. Depois disso o status não pode mais mudar.'
        : 'A O.S. será encerrada. Como o valor é zero, nenhum lançamento financeiro será criado. Depois disso o status não pode mais mudar.';
    case 'cancelada':
      return 'A O.S. será encerrada sem gerar receita. Depois disso o status não pode mais mudar.';
    default:
      return null;
  }
}

/** Atrasada = aberta ou em andamento há mais de uma semana. */
export function diasEmAberto(os: Pick<OrdemServico, 'status' | 'dataAbertura'>): number | null {
  if (ehStatusFinalOS(os.status)) return null;
  const dias = (Date.now() - new Date(os.dataAbertura).getTime()) / 86_400_000;
  return Math.floor(dias);
}
