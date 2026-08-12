import { z } from 'zod';
import { api } from '@/comum/api';

// Tons derivados do fundo de cartão da paleta, não cores soltas: a nota
// precisa se distinguir das vizinhas sem brigar com o resto da tela.
// Ficam em hex, e não em token, porque a escolha é gravada por nota no
// banco — o valor precisa sobreviver a uma troca de tema.
export const CORES_NOTA = ['#232830', '#332a1e', '#1f2b38', '#233029', '#2e2536'] as const;

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
