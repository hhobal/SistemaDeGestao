import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from '@/comum/useDebounce';
import { formatarMoeda } from '@/comum/tipos';
import { useCarrinho } from './CarrinhoContext';
import {
  chavesLoja,
  listarCatalogo,
  listarCategoriasLoja,
  type ProdutoLoja
} from './api';

export function Catalogo() {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const { adicionar } = useCarrinho();

  const buscaAtrasada = useDebounce(busca);

  const produtos = useQuery({
    queryKey: chavesLoja.catalogo(buscaAtrasada, categoria),
    queryFn: ({ signal }) => listarCatalogo(buscaAtrasada, categoria, signal),
    placeholderData: keepPreviousData
  });

  const { data: categorias = [] } = useQuery({
    queryKey: chavesLoja.categorias,
    queryFn: listarCategoriasLoja,
    staleTime: 5 * 60_000
  });

  function aoAdicionar(produto: ProdutoLoja) {
    const problema = adicionar(produto);
    setAviso(problema ?? `${produto.nome} foi para o carrinho.`);
    // A mensagem some sozinha: é confirmação, não algo a resolver.
    window.setTimeout(() => setAviso(null), 3000);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Peças e acessórios</h1>
        <p className="text-sm text-texto-suave">
          Produtos testados, com garantia de 12 meses.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar produto…"
          aria-label="Buscar no catálogo"
          className="min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        />
        <select
          value={categoria}
          onChange={e => setCategoria(e.target.value)}
          aria-label="Filtrar por categoria"
          className="rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        >
          <option value="">Todas as categorias</option>
          {categorias.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {aviso && (
        <div
          role="status"
          className="rounded-lg border border-marca/40 bg-marca/10 px-3 py-2 text-sm text-marca"
        >
          {aviso}
        </div>
      )}

      {produtos.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-cartao" />
          ))}
        </div>
      )}

      {produtos.error && (
        <div className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {produtos.error.message}
        </div>
      )}

      {produtos.data && produtos.data.length === 0 && (
        <p className="py-16 text-center text-sm text-texto-fraco">
          Nenhum produto encontrado{buscaAtrasada && ` para "${buscaAtrasada}"`}.
        </p>
      )}

      {produtos.data && produtos.data.length > 0 && (
        <>
          <p className="text-xs text-texto-fraco">
            {produtos.data.length} {produtos.data.length === 1 ? 'produto' : 'produtos'}
          </p>
          <div
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${
              produtos.isFetching ? 'opacity-60' : ''
            }`}
          >
            {produtos.data.map(produto => (
              <CartaoProduto key={produto.id} produto={produto} aoAdicionar={aoAdicionar} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CartaoProduto({
  produto,
  aoAdicionar
}: {
  produto: ProdutoLoja;
  aoAdicionar: (p: ProdutoLoja) => void;
}) {
  // O catálogo já vem filtrado por estoque > 0, mas alguém pode ter
  // comprado a última unidade entre a busca e o clique.
  const ultimasUnidades = produto.estoque <= Math.max(3, produto.estoqueMin);

  return (
    <article className="flex flex-col rounded-xl border border-borda bg-cartao p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="rounded bg-realce px-2 py-0.5 text-[11px] text-texto-suave">
          {produto.categoria ?? 'Geral'}
        </span>
        {ultimasUnidades && (
          <span className="rounded bg-aviso/15 px-2 py-0.5 text-[11px] text-aviso">
            últimas unidades
          </span>
        )}
      </div>

      <h2 className="font-semibold leading-snug">{produto.nome}</h2>

      <p className="mt-1 line-clamp-2 flex-1 text-xs text-texto-fraco">
        {produto.descricao ?? 'Sem descrição.'}
      </p>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold text-ok">{formatarMoeda(produto.preco)}</div>
          <div className="text-[11px] text-texto-fraco">{produto.estoque} em estoque</div>
        </div>
        <button
          onClick={() => aoAdicionar(produto)}
          className="rounded-lg bg-marca px-3 py-2 text-sm font-medium text-white transition hover:bg-marca-escura"
        >
          Adicionar
        </button>
      </div>
    </article>
  );
}
