import { z } from 'zod';
import { api } from '@/comum/api';

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
