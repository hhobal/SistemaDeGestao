// ======================================
// TABELA GENÉRICA
// ======================================
// O painel tem nove listagens com a mesma estrutura. No front anterior
// cada uma montava o próprio HTML por concatenação — nove lugares para
// corrigir quando algo mudava. Aqui a tabela é uma só e cada tela
// descreve apenas suas colunas.

import type { ReactNode } from 'react';

export type Coluna<T> = {
  cabecalho: string;
  /** Como desenhar a célula. Recebe a linha inteira. */
  celula: (item: T) => ReactNode;
  /** Alinhamento; padrão é à esquerda. */
  alinhamento?: 'esquerda' | 'direita' | 'centro';
  /** Colunas secundárias somem no celular para a tabela caber. */
  ocultarNoCelular?: boolean;
};

type Props<T> = {
  colunas: Coluna<T>[];
  itens: T[];
  chave: (item: T) => string | number;
  carregando?: boolean;
  vazio?: ReactNode;
};

const ALINHAMENTO = {
  esquerda: 'text-left',
  direita: 'text-right',
  centro: 'text-center'
} as const;

export function Tabela<T>({ colunas, itens, chave, carregando, vazio }: Props<T>) {
  if (carregando) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-realce" />
        ))}
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-texto-fraco">
        {vazio ?? 'Nenhum registro encontrado.'}
      </div>
    );
  }

  return (
    // A rolagem fica no contêiner: sem isto, uma tabela larga empurra a
    // página inteira para o lado no celular.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-borda">
            {colunas.map((coluna, i) => (
              <th
                key={i}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold text-texto-suave ${
                  ALINHAMENTO[coluna.alinhamento ?? 'esquerda']
                } ${coluna.ocultarNoCelular ? 'hidden md:table-cell' : ''}`}
              >
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {itens.map(item => (
            <tr
              key={chave(item)}
              className="border-b border-borda/60 transition hover:bg-realce/50"
            >
              {colunas.map((coluna, i) => (
                <td
                  key={i}
                  className={`px-4 py-3 ${ALINHAMENTO[coluna.alinhamento ?? 'esquerda']} ${
                    coluna.ocultarNoCelular ? 'hidden md:table-cell' : ''
                  }`}
                >
                  {coluna.celula(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
