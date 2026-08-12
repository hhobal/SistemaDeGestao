import { z } from 'zod';
import { api } from '@/comum/api';

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
