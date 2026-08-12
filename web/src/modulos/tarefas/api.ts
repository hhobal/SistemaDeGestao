import { z } from 'zod';
import { api } from '@/comum/api';

export const COLUNAS_KANBAN = [
  { id: 'backlog', rotulo: 'A fazer' },
  { id: 'andamento', rotulo: 'Em andamento' },
  { id: 'revisao', rotulo: 'Em revisão' },
  { id: 'concluido', rotulo: 'Concluído' }
] as const;

export type StatusTarefa = (typeof COLUNAS_KANBAN)[number]['id'];

export const PRIORIDADES_TAREFA = ['baixa', 'media', 'alta'] as const;
export type PrioridadeTarefa = (typeof PRIORIDADES_TAREFA)[number];

export type Tarefa = {
  id: number;
  titulo: string;
  descricao: string | null;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  dataLimite: string | null;
  responsavelId: number | null;
  responsavel: { id: number; nome: string } | null;
};

export const esquemaTarefa = z.object({
  titulo: z.string().trim().min(1, 'Informe o título.'),
  descricao: z.string().trim(),
  prioridade: z.enum(PRIORIDADES_TAREFA),
  status: z.enum(COLUNAS_KANBAN.map(c => c.id) as unknown as [StatusTarefa, ...StatusTarefa[]]),
  dataLimite: z.string()
});

export type DadosTarefa = z.output<typeof esquemaTarefa>;

export const chavesTarefa = { todas: ['tarefas'] as const };

export const listarTarefas = (sinal?: AbortSignal) => api.get<Tarefa[]>('/tarefas', { sinal });

// Data em branco significa "sem prazo", e o servidor espera null.
const prazoParaISO = (data: string) => (data ? new Date(`${data}T12:00:00`).toISOString() : null);

export const criarTarefa = (d: DadosTarefa) =>
  api.post<Tarefa>('/tarefas', { ...d, dataLimite: prazoParaISO(d.dataLimite) });
export const atualizarTarefa = (id: number, d: DadosTarefa) =>
  api.put<Tarefa>(`/tarefas/${id}`, { ...d, dataLimite: prazoParaISO(d.dataLimite) });
export const moverTarefa = (id: number, status: StatusTarefa) =>
  api.patch<Tarefa>(`/tarefas/${id}/status`, { status });
export const excluirTarefa = (id: number) => api.delete<void>(`/tarefas/${id}`);

/** Prazo vencido só importa em tarefa não concluída. */
export function tarefaAtrasada(t: Pick<Tarefa, 'status' | 'dataLimite'>, hoje = new Date()) {
  if (!t.dataLimite || t.status === 'concluido') return false;
  return String(t.dataLimite).slice(0, 10) < hoje.toISOString().slice(0, 10);
}
