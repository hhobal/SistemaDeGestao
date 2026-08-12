// ======================================
// CADASTROS SIMPLES
// ======================================
// Fornecedores, agenda, tarefas e notas seguem o mesmo formato: uma
// lista, um formulário e nenhuma regra de negócio além da validação.
// Ficam juntos porque separá-los em quatro arquivos idênticos só
// espalharia o mesmo código.

import { z } from 'zod';
import { api, query } from '../lib/api';
import type { Paginado } from '../lib/tipos';

// ─── FORNECEDORES ───────────────────────────────────────

export type Fornecedor = {
  id: number;
  empresa: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  cnpj: string | null;
  categoria: string | null;
  criadoEm: string;
};

export const esquemaFornecedor = z.object({
  empresa: z.string().trim().min(1, 'Informe a empresa.'),
  contato: z.string().trim(),
  telefone: z.string().trim(),
  // O servidor aceita string vazia aqui, então a validação de formato
  // só se aplica quando algo foi digitado.
  email: z.string().trim().refine(v => v === '' || z.string().email().safeParse(v).success, 'E-mail inválido.'),
  cnpj: z.string().trim(),
  categoria: z.string().trim()
});

export type DadosFornecedor = z.output<typeof esquemaFornecedor>;

export const chavesFornecedor = {
  todos: ['fornecedores'] as const,
  lista: (busca: string, pagina: number) => ['fornecedores', busca, pagina] as const
};

export const listarFornecedores = (busca: string, pagina: number, sinal?: AbortSignal) =>
  api.get<Paginado<Fornecedor>>(`/fornecedores${query({ busca, pagina, porPagina: 20 })}`, { sinal });

export const criarFornecedor = (d: DadosFornecedor) => api.post<Fornecedor>('/fornecedores', d);
export const atualizarFornecedor = (id: number, d: DadosFornecedor) =>
  api.put<Fornecedor>(`/fornecedores/${id}`, d);
export const excluirFornecedor = (id: number) => api.delete<void>(`/fornecedores/${id}`);

// ─── AGENDA ─────────────────────────────────────────────

export const TIPOS_EVENTO = ['reuniao', 'tarefa', 'compromisso', 'outro'] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const ROTULO_EVENTO: Record<TipoEvento, string> = {
  reuniao: 'Reunião',
  tarefa: 'Tarefa',
  compromisso: 'Compromisso',
  outro: 'Outro'
};

export type Evento = {
  id: number;
  titulo: string;
  data: string;
  hora: string | null;
  descricao: string | null;
  tipo: TipoEvento;
};

export const esquemaEvento = z.object({
  titulo: z.string().trim().min(1, 'Informe o título.'),
  data: z.string().min(1, 'Escolha a data.'),
  hora: z.string().trim(),
  descricao: z.string().trim(),
  tipo: z.enum(TIPOS_EVENTO)
});

export type DadosEvento = z.output<typeof esquemaEvento>;

export const chavesEvento = { todos: ['agenda'] as const };

export const listarEventos = (sinal?: AbortSignal) => api.get<Evento[]>('/agenda', { sinal });

/**
 * O <input type="date"> devolve "aaaa-mm-dd" sem fuso. Enviar assim faz
 * o servidor interpretar como meia-noite UTC, que no Brasil é o dia
 * anterior. Fixar meio-dia local mantém a data que a pessoa escolheu.
 */
const paraISO = (data: string) => new Date(`${data}T12:00:00`).toISOString();

export const criarEvento = (d: DadosEvento) =>
  api.post<Evento>('/agenda', { ...d, data: paraISO(d.data) });
export const atualizarEvento = (id: number, d: DadosEvento) =>
  api.put<Evento>(`/agenda/${id}`, { ...d, data: paraISO(d.data) });
export const excluirEvento = (id: number) => api.delete<void>(`/agenda/${id}`);

/** Só a parte da data, sem conversão de fuso. */
export const diaDoEvento = (iso: string) => String(iso).slice(0, 10);

export const eventoJaPassou = (evento: Pick<Evento, 'data'>, hoje = new Date()) =>
  diaDoEvento(evento.data) < hoje.toISOString().slice(0, 10);

// ─── TAREFAS ────────────────────────────────────────────

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

// ─── NOTAS ──────────────────────────────────────────────

export const CORES_NOTA = ['#1e2430', '#2a2035', '#1e2a30', '#302020', '#25302a'] as const;

export type Nota = {
  id: number;
  titulo: string;
  conteudo: string | null;
  cor: string | null;
  criadoEm: string;
};

export const esquemaNota = z.object({
  titulo: z.string().trim().min(1, 'Informe o título.'),
  conteudo: z.string().trim(),
  cor: z.string().trim()
});

export type DadosNota = z.output<typeof esquemaNota>;

export const chavesNota = { todas: ['notas'] as const };

export const listarNotas = (sinal?: AbortSignal) => api.get<Nota[]>('/notas', { sinal });
export const criarNota = (d: DadosNota) => api.post<Nota>('/notas', d);
export const atualizarNota = (id: number, d: DadosNota) => api.put<Nota>(`/notas/${id}`, d);
export const excluirNota = (id: number) => api.delete<void>(`/notas/${id}`);
