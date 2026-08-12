import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Tabela, type Coluna } from '@/comum/componentes/Tabela';
import { Paginacao } from '@/comum/componentes/Paginacao';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { FormularioProduto } from './FormularioProduto';
import { useDebounce } from '@/comum/useDebounce';
import { useAuth } from '@/auth/AuthContext';
import { ErroApi } from '@/comum/api';
import { formatarMoeda } from '@/comum/tipos';
import {
  atualizarProduto,
  chavesProduto,
  criarProduto,
  excluirProduto,
  listarCategorias,
  listarProdutos,
  margem,
  situacaoEstoque,
  type DadosProduto,
  type Produto
} from './api';

const CORES_ESTOQUE = {
  zerado: 'text-erro',
  critico: 'text-aviso',
  ok: 'text-texto'
} as const;

export function Produtos() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [pagina, setPagina] = useState(1);

  const [emEdicao, setEmEdicao] = useState<Produto | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Produto | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const buscaAtrasada = useDebounce(busca);
  const filtros = { busca: buscaAtrasada, categoria, pagina, porPagina: 20 };

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: chavesProduto.lista(filtros),
    queryFn: ({ signal }) => listarProdutos(filtros, signal),
    placeholderData: keepPreviousData
  });

  const { data: categorias = [] } = useQuery({
    queryKey: chavesProduto.categorias,
    queryFn: listarCategorias,
    // Categoria muda pouco; recarregar a cada visita à tela é desperdício.
    staleTime: 5 * 60_000
  });

  function aoTerminar() {
    fila.invalidateQueries({ queryKey: chavesProduto.todos });
  }

  const salvar = useMutation({
    mutationFn: (dados: DadosProduto) =>
      emEdicao ? atualizarProduto(emEdicao.id, dados) : criarProduto(dados),
    onSuccess: () => {
      aoTerminar();
      setFormularioAberto(false);
      setEmEdicao(null);
    },
    // Código repetido devolve 409 — a coluna é única no banco.
    onError: erro =>
      setErroFormulario(erro instanceof ErroApi ? erro.message : 'Não foi possível salvar.')
  });

  const excluir = useMutation({
    mutationFn: (produto: Produto) => excluirProduto(produto.id),
    onSuccess: () => {
      aoTerminar();
      setParaExcluir(null);
    },
    onError: erro =>
      setErroExclusao(erro instanceof ErroApi ? erro.message : 'Não foi possível excluir.')
  });

  function abrirNovo() {
    setEmEdicao(null);
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    setEmEdicao(produto);
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  const colunas: Coluna<Produto>[] = [
    {
      cabecalho: 'Produto',
      celula: produto => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{produto.nome}</span>
            {!produto.ativo && (
              <span className="shrink-0 rounded bg-texto-fraco/20 px-1.5 py-0.5 text-[10px] text-texto-suave">
                inativo
              </span>
            )}
          </div>
          {produto.codigo && (
            <div className="font-mono text-xs text-texto-fraco">{produto.codigo}</div>
          )}
        </div>
      )
    },
    {
      cabecalho: 'Categoria',
      ocultarNoCelular: true,
      celula: produto => (
        <span className="rounded bg-realce px-2 py-0.5 text-xs text-texto-suave">
          {produto.categoria || '—'}
        </span>
      )
    },
    {
      cabecalho: 'Preço',
      alinhamento: 'direita',
      celula: produto => {
        const percentual = margem(produto);
        return (
          <div>
            <div className="font-semibold">{formatarMoeda(produto.preco)}</div>
            {percentual !== null && (
              <div className="text-xs text-ok">{percentual.toFixed(0)}% margem</div>
            )}
          </div>
        );
      }
    },
    {
      cabecalho: 'Custo',
      alinhamento: 'direita',
      ocultarNoCelular: true,
      celula: produto => (
        <span className="text-xs text-texto-suave">{formatarMoeda(produto.custo)}</span>
      )
    },
    {
      cabecalho: 'Estoque',
      alinhamento: 'direita',
      celula: produto => {
        const situacao = situacaoEstoque(produto);
        return (
          <div>
            <div className={`font-semibold ${CORES_ESTOQUE[situacao]}`}>{produto.estoque}</div>
            {situacao !== 'ok' && (
              <div className="text-[10px] text-texto-fraco">
                {situacao === 'zerado' ? 'esgotado' : `mín. ${produto.estoqueMin}`}
              </div>
            )}
          </div>
        );
      }
    },
    {
      cabecalho: '',
      alinhamento: 'direita',
      celula: produto =>
        podeEscrever ? (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => abrirEdicao(produto)}
              aria-label={`Editar ${produto.nome}`}
              className="rounded px-2 py-1 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
            >
              Editar
            </button>
            <button
              onClick={() => {
                setErroExclusao(null);
                setParaExcluir(produto);
              }}
              aria-label={`Excluir ${produto.nome}`}
              className="rounded px-2 py-1 text-xs text-erro transition hover:bg-erro/10"
            >
              Excluir
            </button>
          </div>
        ) : null
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Produtos</h1>
          <p className="text-sm text-texto-suave">Catálogo vendido na loja e usado nas O.S.</p>
        </div>
        {podeEscrever && <Botao onClick={abrirNovo}>Novo produto</Botao>}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={evento => {
            setBusca(evento.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por nome ou código…"
          aria-label="Buscar produtos"
          className="min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        />
        <select
          value={categoria}
          onChange={evento => {
            setCategoria(evento.target.value);
            setPagina(1);
          }}
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

      {error && (
        <div className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {error.message}
        </div>
      )}

      <div
        className={`rounded-xl border border-borda bg-cartao transition-opacity ${
          isFetching && !isPending ? 'opacity-60' : ''
        }`}
      >
        <Tabela
          colunas={colunas}
          itens={data?.itens ?? []}
          chave={produto => produto.id}
          carregando={isPending}
          vazio={
            buscaAtrasada || categoria
              ? 'Nenhum produto encontrado com esses filtros.'
              : 'Nenhum produto cadastrado ainda.'
          }
        />
        {data && (
          <div className="border-t border-borda">
            <Paginacao
              pagina={data.paginacao.pagina}
              totalPaginas={data.paginacao.totalPaginas}
              total={data.paginacao.total}
              aoMudar={setPagina}
            />
          </div>
        )}
      </div>

      <FormularioProduto
        aberto={formularioAberto}
        produto={emEdicao}
        categorias={categorias}
        salvando={salvar.isPending}
        erro={erroFormulario}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={dados => salvar.mutate(dados)}
      />

      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir produto"
        aoFechar={() => setParaExcluir(null)}
        rodape={
          <>
            <Botao
              variante="secundario"
              onClick={() => setParaExcluir(null)}
              disabled={excluir.isPending}
            >
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => paraExcluir && excluir.mutate(paraExcluir)}
              disabled={excluir.isPending}
            >
              {excluir.isPending ? 'Excluindo…' : 'Excluir'}
            </Botao>
          </>
        }
      >
        {erroExclusao ? (
          <p className="text-sm text-erro">{erroExclusao}</p>
        ) : (
          <p className="text-sm text-texto-suave">
            Excluir <strong className="text-texto">{paraExcluir?.nome}</strong>? Se ele já apareceu
            em algum pedido, prefira desmarcá-lo como ativo.
          </p>
        )}
      </Modal>
    </div>
  );
}
