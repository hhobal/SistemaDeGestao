import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { Paginacao } from '../componentes/Paginacao';
import { Botao } from '../componentes/Botao';
import { Modal } from '../componentes/Modal';
import { FormularioLancamento } from '../financas/FormularioLancamento';
import { useDebounce } from '../lib/useDebounce';
import { useAuth } from '../auth/AuthContext';
import { ErroApi } from '../lib/api';
import { formatarData, formatarMoeda, paraNumero } from '../lib/tipos';
import {
  alterarStatusLancamento,
  atualizarLancamento,
  chavesFinancas,
  criarLancamento,
  ehAutomatico,
  estaVencido,
  excluirLancamento,
  listarLancamentos,
  MOTIVO_BLOQUEIO,
  obterResumo,
  origemDoLancamento,
  podeEditar,
  STATUS_LANCAMENTO,
  TIPOS,
  type DadosLancamento,
  type Lancamento,
  type StatusLancamento,
  type TipoLancamento
} from '../financas/api';

const ROTULO_ORIGEM = {
  manual: 'Manual',
  pedido: 'Pedido',
  os: 'O.S.'
} as const;

export function Financas() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<TipoLancamento | ''>('');
  const [status, setStatus] = useState<StatusLancamento | ''>('');
  const [pagina, setPagina] = useState(1);

  const [emEdicao, setEmEdicao] = useState<Lancamento | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Lancamento | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscaAtrasada = useDebounce(busca);
  const filtros = { busca: buscaAtrasada, tipo, status, pagina, porPagina: 20 };
  // Os cards recebem os mesmos filtros da tabela, menos a paginação:
  // eles somam o recorte inteiro, não a página exibida.
  const filtrosResumo = { busca: buscaAtrasada, tipo, status };

  const lista = useQuery({
    queryKey: chavesFinancas.lista(filtros),
    queryFn: ({ signal }) => listarLancamentos(filtros, signal),
    placeholderData: keepPreviousData
  });

  const resumo = useQuery({
    queryKey: chavesFinancas.resumo(filtrosResumo),
    queryFn: ({ signal }) => obterResumo(filtrosResumo, signal),
    placeholderData: keepPreviousData
  });

  function aoTerminar() {
    fila.invalidateQueries({ queryKey: chavesFinancas.todas });
    fila.invalidateQueries({ queryKey: ['dashboard'] });
  }

  const salvar = useMutation({
    mutationFn: (dados: DadosLancamento) =>
      emEdicao ? atualizarLancamento(emEdicao.id, dados) : criarLancamento(dados),
    onSuccess: () => {
      aoTerminar();
      setFormularioAberto(false);
      setEmEdicao(null);
    },
    onError: e => setErroFormulario(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
  });

  const alternarStatus = useMutation({
    mutationFn: (l: Lancamento) =>
      alterarStatusLancamento(l.id, l.status === 'pago' ? 'pendente' : 'pago'),
    onSuccess: aoTerminar,
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível alterar a situação.')
  });

  const remover = useMutation({
    mutationFn: (l: Lancamento) => excluirLancamento(l.id),
    onSuccess: () => {
      aoTerminar();
      setParaExcluir(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  const colunas: Coluna<Lancamento>[] = [
    {
      cabecalho: 'Descrição',
      celula: l => {
        const origem = origemDoLancamento(l);
        return (
          <div className="min-w-0">
            <div className="truncate">{l.descricao}</div>
            <div className="flex items-center gap-2 text-xs text-texto-fraco">
              <span>{l.categoria || 'Sem categoria'}</span>
              {origem !== 'manual' && (
                // Deixa visível que a linha é reflexo de outra coisa, e
                // por isso não tem botão de editar.
                <span className="rounded bg-realce px-1.5 py-0.5 text-[10px]">
                  via {ROTULO_ORIGEM[origem]}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      cabecalho: 'Data',
      ocultarNoCelular: true,
      celula: l => (
        <span className={`text-xs ${estaVencido(l) ? 'text-aviso' : ''}`}>
          {formatarData(l.data)}
          {estaVencido(l) && <span className="ml-1">· vencido</span>}
        </span>
      )
    },
    {
      cabecalho: 'Valor',
      alinhamento: 'direita',
      celula: l => (
        <span className={`font-semibold ${l.tipo === 'receita' ? 'text-ok' : 'text-erro'}`}>
          {l.tipo === 'receita' ? '+' : '−'} {formatarMoeda(l.valor)}
        </span>
      )
    },
    {
      cabecalho: 'Situação',
      celula: l =>
        podeEscrever ? (
          <button
            onClick={() => {
              setErro(null);
              alternarStatus.mutate(l);
            }}
            disabled={alternarStatus.isPending}
            aria-label={`Marcar "${l.descricao}" como ${l.status === 'pago' ? 'pendente' : 'pago'}`}
            className={`rounded-full px-2 py-0.5 text-xs transition ${
              l.status === 'pago'
                ? 'bg-ok/15 text-ok hover:bg-ok/25'
                : 'bg-aviso/15 text-aviso hover:bg-aviso/25'
            }`}
          >
            {l.status === 'pago' ? 'Pago' : 'Pendente'}
          </button>
        ) : (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              l.status === 'pago' ? 'bg-ok/15 text-ok' : 'bg-aviso/15 text-aviso'
            }`}
          >
            {l.status === 'pago' ? 'Pago' : 'Pendente'}
          </span>
        )
    },
    {
      cabecalho: '',
      alinhamento: 'direita',
      celula: l => {
        if (!podeEscrever) return null;
        if (!podeEditar(l)) {
          return (
            <span className="text-xs text-texto-fraco" title={MOTIVO_BLOQUEIO}>
              automático
            </span>
          );
        }
        return (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => {
                setEmEdicao(l);
                setErroFormulario(null);
                setFormularioAberto(true);
              }}
              aria-label={`Editar ${l.descricao}`}
              className="rounded px-2 py-1 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
            >
              Editar
            </button>
            <button
              onClick={() => {
                setErro(null);
                setParaExcluir(l);
              }}
              aria-label={`Excluir ${l.descricao}`}
              className="rounded px-2 py-1 text-xs text-erro transition hover:bg-erro/10"
            >
              Excluir
            </button>
          </div>
        );
      }
    }
  ];

  const saldo = paraNumero(resumo.data?.saldo);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Finanças</h1>
          <p className="text-sm text-texto-suave">
            Vendas da loja e O.S. concluídas entram aqui automaticamente.
          </p>
        </div>
        {podeEscrever && (
          <Botao
            onClick={() => {
              setEmEdicao(null);
              setErroFormulario(null);
              setFormularioAberto(true);
            }}
          >
            Novo lançamento
          </Botao>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card rotulo="Receitas" valor={formatarMoeda(resumo.data?.receita)} cor="text-ok" />
        <Card rotulo="Despesas" valor={formatarMoeda(resumo.data?.despesa)} cor="text-erro" />
        <Card
          rotulo="Saldo"
          valor={formatarMoeda(resumo.data?.saldo)}
          cor={saldo >= 0 ? 'text-ok' : 'text-erro'}
        />
        <Card rotulo="Pendentes" valor={String(resumo.data?.pendentes ?? '—')} />
      </div>

      {/* O texto abaixo não é decoração: na versão anterior os cards
          somavam todos os lançamentos enquanto a tabela mostrava um
          recorte, e ninguém percebia que os números não conversavam. */}
      {(tipo || status || buscaAtrasada) && (
        <p className="text-xs text-texto-fraco">
          Os totais acima consideram apenas os lançamentos filtrados.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={e => {
            setBusca(e.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por descrição ou categoria…"
          aria-label="Buscar lançamentos"
          className="min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        />
        <select
          value={tipo}
          onChange={e => {
            setTipo(e.target.value as TipoLancamento | '');
            setPagina(1);
          }}
          aria-label="Filtrar por tipo"
          className="rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        >
          <option value="">Receitas e despesas</option>
          {TIPOS.map(t => (
            <option key={t} value={t}>
              {t === 'receita' ? 'Só receitas' : 'Só despesas'}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value as StatusLancamento | '');
            setPagina(1);
          }}
          aria-label="Filtrar por situação"
          className="rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        >
          <option value="">Todas as situações</option>
          {STATUS_LANCAMENTO.map(s => (
            <option key={s} value={s}>
              {s === 'pago' ? 'Pagos' : 'Pendentes'}
            </option>
          ))}
        </select>
      </div>

      {(erro || lista.error) && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {erro ?? lista.error?.message}
        </div>
      )}

      <div
        className={`rounded-xl border border-borda bg-cartao transition-opacity ${
          lista.isFetching && !lista.isPending ? 'opacity-60' : ''
        }`}
      >
        <Tabela
          colunas={colunas}
          itens={lista.data?.itens ?? []}
          chave={l => l.id}
          carregando={lista.isPending}
          vazio={
            buscaAtrasada || tipo || status
              ? 'Nenhum lançamento encontrado com esses filtros.'
              : 'Nenhum lançamento registrado ainda.'
          }
        />
        {lista.data && (
          <div className="border-t border-borda">
            <Paginacao
              pagina={lista.data.paginacao.pagina}
              totalPaginas={lista.data.paginacao.totalPaginas}
              total={lista.data.paginacao.total}
              aoMudar={setPagina}
            />
          </div>
        )}
      </div>

      <FormularioLancamento
        aberto={formularioAberto}
        lancamento={emEdicao}
        salvando={salvar.isPending}
        erro={erroFormulario}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={dados => salvar.mutate(dados)}
      />

      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir lançamento"
        aoFechar={() => setParaExcluir(null)}
        rodape={
          <>
            <Botao
              variante="secundario"
              onClick={() => setParaExcluir(null)}
              disabled={remover.isPending}
            >
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => paraExcluir && remover.mutate(paraExcluir)}
              disabled={remover.isPending}
            >
              {remover.isPending ? 'Excluindo…' : 'Excluir'}
            </Botao>
          </>
        }
      >
        <p className="text-sm text-texto-suave">
          Excluir <strong className="text-texto">{paraExcluir?.descricao}</strong>?
          {paraExcluir && ehAutomatico(paraExcluir) && ` ${MOTIVO_BLOQUEIO}`}
        </p>
      </Modal>
    </div>
  );
}

function Card({ rotulo, valor, cor = '' }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-xl border border-borda bg-cartao p-3">
      <div className="text-xs text-texto-suave">{rotulo}</div>
      <div className={`mt-1 text-xl font-bold ${cor}`}>{valor}</div>
    </div>
  );
}
