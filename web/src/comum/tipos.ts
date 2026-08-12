// ======================================
// TIPOS COMPARTILHADOS DA API
// ======================================

/**
 * Formato devolvido por toda listagem paginada do back-end
 * (ver backend/src/utils/paginacao.js).
 */
export type Paginado<T> = {
  itens: T[];
  paginacao: {
    total: number;
    pagina: number;
    porPagina: number;
    totalPaginas: number;
  };
};

/**
 * Valores monetários chegam como string porque o Prisma serializa
 * Decimal assim — converter para number no JSON perderia precisão.
 * Use `paraNumero` antes de qualquer conta.
 */
export type Dinheiro = string | number;

export const paraNumero = (valor: Dinheiro | null | undefined) => Number(valor ?? 0);

export const formatarMoeda = (valor: Dinheiro | null | undefined) =>
  paraNumero(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarData = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
