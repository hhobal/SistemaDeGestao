// ======================================
// CARRINHO — ESTADO COMPARTILHADO
// ======================================
// O contador no cabeçalho e a página do carrinho precisam ver a mesma
// coisa. Sem um estado comum, adicionar um produto no catálogo não
// atualizaria o número lá em cima.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  adicionarAoCarrinho,
  gravarCarrinho,
  lerCarrinho,
  limparCarrinho,
  quantidadeTotal,
  totalCarrinho,
  type ItemCarrinho,
  type ProdutoLoja
} from './api';

type ContextoCarrinho = {
  itens: ItemCarrinho[];
  quantidade: number;
  total: number;
  adicionar: (produto: ProdutoLoja, quantidade?: number) => string | null;
  mudarQuantidade: (produtoId: number, quantidade: number) => void;
  remover: (produtoId: number) => void;
  esvaziar: () => void;
};

const Contexto = createContext<ContextoCarrinho | null>(null);

export function ProvedorCarrinho({ children }: { children: ReactNode }) {
  // Lê do localStorage uma única vez, na montagem.
  const [itens, setItens] = useState<ItemCarrinho[]>(() => lerCarrinho());

  const publicar = useCallback((novos: ItemCarrinho[]) => {
    setItens(novos);
    gravarCarrinho(novos);
  }, []);

  const valor = useMemo<ContextoCarrinho>(
    () => ({
      itens,
      quantidade: quantidadeTotal(itens),
      total: totalCarrinho(itens),

      /** Devolve a mensagem de aviso, ou null quando deu certo. */
      adicionar: (produto, quantidade = 1) => {
        const resultado = adicionarAoCarrinho(itens, produto, quantidade);
        if (!resultado.aviso) publicar(resultado.itens);
        return resultado.aviso;
      },

      mudarQuantidade: (produtoId, quantidade) => {
        // Zero ou negativo significa tirar do carrinho.
        if (quantidade <= 0) {
          publicar(itens.filter(i => i.produtoId !== produtoId));
          return;
        }
        publicar(itens.map(i => (i.produtoId === produtoId ? { ...i, quantidade } : i)));
      },

      remover: produtoId => publicar(itens.filter(i => i.produtoId !== produtoId)),

      esvaziar: () => {
        setItens([]);
        limparCarrinho();
      }
    }),
    [itens, publicar]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrinho() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useCarrinho precisa estar dentro de <ProvedorCarrinho>.');
  return contexto;
}
