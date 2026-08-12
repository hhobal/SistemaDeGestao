import { z } from 'zod';
import { api, query } from '@/comum/api';
import type { Paginado } from '@/comum/tipos';

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
