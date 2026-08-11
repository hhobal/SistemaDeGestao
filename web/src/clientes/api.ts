// ======================================
// CLIENTES — DADOS
// ======================================
// O schema espelha o de backend/src/controllers/clientes.controller.js.
// Validar aqui evita ida ao servidor por erro óbvio; a validação que
// realmente protege continua sendo a de lá, porque o navegador é
// território do usuário.

import { z } from 'zod';
import { api, query } from '../lib/api';
import type { Paginado } from '../lib/tipos';

export const STATUS_CLIENTE = ['ativo', 'inativo', 'inadimplente'] as const;
export type StatusCliente = (typeof STATUS_CLIENTE)[number];

export type Cliente = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  endereco: string | null;
  observacao: string | null;
  status: StatusCliente;
  origem: 'manual' | 'loja';
  criadoEm: string;
};

// Campo vazio precisa virar null, e não "": as colunas email e cpf são
// UNIQUE no banco, e dois cadastros com string vazia colidiriam.
const vazioParaNulo = (valor: unknown) => (valor === '' || valor === undefined ? null : valor);

export const esquemaCliente = z.object({
  nome: z.string().trim().min(1, 'Informe o nome.'),
  email: z.preprocess(vazioParaNulo, z.string().email('E-mail inválido.').nullable()),
  telefone: z.string().trim(),
  cpf: z.preprocess(vazioParaNulo, z.string().nullable()),
  endereco: z.string().trim(),
  observacao: z.string().trim(),
  status: z.enum(STATUS_CLIENTE)
});

export type FormularioCliente = z.input<typeof esquemaCliente>;

export type FiltrosCliente = {
  busca?: string;
  status?: StatusCliente | '';
  pagina?: number;
  porPagina?: number;
};

export const chavesCliente = {
  todos: ['clientes'] as const,
  lista: (filtros: FiltrosCliente) => ['clientes', 'lista', filtros] as const
};

export function listarClientes(filtros: FiltrosCliente, sinal?: AbortSignal) {
  return api.get<Paginado<Cliente>>(
    `/clientes${query({
      busca: filtros.busca,
      status: filtros.status,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina
    })}`,
    { sinal }
  );
}

export const criarCliente = (dados: FormularioCliente) => api.post<Cliente>('/clientes', dados);

export const atualizarCliente = (id: number, dados: FormularioCliente) =>
  api.put<Cliente>(`/clientes/${id}`, dados);

export const excluirCliente = (id: number) => api.delete<void>(`/clientes/${id}`);
