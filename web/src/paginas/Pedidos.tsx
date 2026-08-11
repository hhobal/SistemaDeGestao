import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { Paginacao } from '../componentes/Paginacao';
import { Botao } from '../componentes/Botao';
import { Modal } from '../componentes/Modal';
import { DetalhesPedido } from '../pedidos/DetalhesPedido';
import { EtiquetaStatus } from '../pedidos/EtiquetaStatus';
import { useDebounce } from '../lib/useDebounce';
import { useAuth } from '../auth/AuthContext';
import { ErroApi } from '../lib/api';
import { formatarData, formatarMoeda } from '../lib/tipos';
import {
  alterarStatusPedido,
  chavesPedido,
  consequenciaDoStatus,
  excluirPedido,
  listarPedidos,
  obterResumoPedidos,
  podeAlterarStatus,
  podeExcluir,
  ROTULO_PAGAMENTO,
  ROTULO_STATUS,
  STATUS_PEDIDO,
  type Pedido,
  type StatusPedido
} from '../pedidos/api';

export function Pedidos() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusPedido | ''>('');
  const [pagina, setPagina] = useState(1);

  const [detalhe, setDetalhe] = useState<Pedido | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Pedido | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ pedido: Pedido; novo: StatusPedido } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscaAtrasada = useDebounce(busca);
  const filtros = { busca: buscaAtrasada, status, pagina, porPagina: 20 };

  const lista = useQuery({
    queryKey: chavesPedido.lista(filtros),
    queryFn: ({ signal }) => listarPedidos(filtros, signal),
    placeholderData: keepPreviousData
  });

  const resumo = useQuery({
    queryKey: chavesPedido.resumo,
    queryFn: obterResumoPedidos
  });

  function aoTerminar() {
    // A mudança de status mexe em estoque e financeiro; invalidar só a
    // lista deixaria os cards e o dashboard desatualizados.
    fila.invalidateQueries({ queryKey: chavesPedido.todos });
    fila.invalidateQueries({ queryKey: ['dashboard'] });
    fila.invalidateQueries({ queryKey: ['produtos'] });
  }

  const mudarStatus = useMutation({
    mutationFn: ({ pedido, novo }: { pedido: Pedido; novo: StatusPedido }) =>
      alterarStatusPedido(pedido.id, novo),
    onSuccess: () => {
      aoTerminar();
      setConfirmacao(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível alterar o status.')
  });

  const remover = useMutation({
    mutationFn: (pedido: Pedido) => excluirPedido(pedido.id),
    onSuccess: () => {
      aoTerminar();
      setParaExcluir(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  function pedirConfirmacao(pedido: Pedido, novo: StatusPedido) {
    setErro(null);
    const aviso = consequenciaDoStatus(novo);
    // Movimentos reversíveis (em preparo, enviado) seguem direto; os que
    // mexem em estoque ou financeiro pedem confirmação.
    if (aviso) setConfirmacao({ pedido, novo });
    else mudarStatus.mutate({ pedido, novo });
  }

  const colunas: Coluna<Pedido>[] = [
    {
      cabecalho: 'Pedido',
      celula: pedido => (
        <button
          onClick={() => setDetalhe(pedido)}
          className="font-mono font-semibold text-marca hover:underline"
          aria-label={`Ver detalhes do pedido ${pedido.numero}`}
        >
          #{pedido.numero}
        </button>
      )
    },
    {
      cabecalho: 'Cliente',
      celula: pedido => (
        <div className="min-w-0">
          <div className="truncate">{pedido.cliente?.nome ?? '—'}</div>
          <div className="truncate text-xs text-texto-fraco">{pedido.cliente?.email}</div>
        </div>
      )
    },
    {
      cabecalho: 'Itens',
      alinhamento: 'centro',
      ocultarNoCelular: true,
      celula: pedido => <span className="text-xs">{pedido.itens?.length ?? 0}</span>
    },
    {
      cabecalho: 'Pagamento',
      ocultarNoCelular: true,
      celula: pedido => (
        <span className="text-xs text-texto-suave">
          {ROTULO_PAGAMENTO[pedido.pagamento] ?? pedido.pagamento}
        </span>
      )
    },
    {
      cabecalho: 'Total',
      alinhamento: 'direita',
      celula: pedido => <span className="font-semibold text-ok">{formatarMoeda(pedido.total)}</span>
    },
    {
      cabecalho: 'Data',
      ocultarNoCelular: true,
      celula: pedido => <span className="text-xs">{formatarData(pedido.data)}</span>
    },
    {
      cabecalho: 'Situação',
      celula: pedido =>
        podeEscrever && podeAlterarStatus(pedido) ? (
          <select
            value={pedido.status}
            onChange={evento => pedirConfirmacao(pedido, evento.target.value as StatusPedido)}
            aria-label={`Situação do pedido ${pedido.numero}`}
            className="rounded border border-borda bg-fundo px-2 py-1 text-xs outline-none focus:border-marca"
          >
            {STATUS_PEDIDO.map(s => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
        ) : (
          <EtiquetaStatus status={pedido.status} />
        )
    },
    {
      cabecalho: '',
      alinhamento: 'direita',
      celula: pedido =>
        podeEscrever && podeExcluir(pedido) ? (
          <button
            onClick={() => {
              setErro(null);
              setParaExcluir(pedido);
            }}
            aria-label={`Excluir pedido ${pedido.numero}`}
            className="rounded px-2 py-1 text-xs text-erro transition hover:bg-erro/10"
          >
            Excluir
          </button>
        ) : null
    }
  ];

  const cards = [
    { rotulo: 'Pendentes', valor: resumo.data?.pendentes ?? '—' },
    { rotulo: 'Em preparo', valor: resumo.data?.processando ?? '—' },
    { rotulo: 'Enviados', valor: resumo.data?.enviados ?? '—' },
    {
      rotulo: 'Faturado',
      valor: resumo.data ? formatarMoeda(resumo.data.faturado) : '—'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Pedidos da loja</h1>
        <p className="text-sm text-texto-suave">
          Criados pelos clientes na loja virtual. Alterar a situação move estoque e financeiro.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.rotulo} className="rounded-xl border border-borda bg-cartao p-3">
            <div className="text-xs text-texto-suave">{card.rotulo}</div>
            <div className="mt-1 text-xl font-bold">{card.valor}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={evento => {
            setBusca(evento.target.value);
            setPagina(1);
          }}
          placeholder="Buscar por número ou cliente…"
          aria-label="Buscar pedidos"
          className="min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        />
        <select
          value={status}
          onChange={evento => {
            setStatus(evento.target.value as StatusPedido | '');
            setPagina(1);
          }}
          aria-label="Filtrar por situação"
          className="rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        >
          <option value="">Todas as situações</option>
          {STATUS_PEDIDO.map(s => (
            <option key={s} value={s}>
              {ROTULO_STATUS[s]}
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
          chave={pedido => pedido.id}
          carregando={lista.isPending}
          vazio={
            buscaAtrasada || status
              ? 'Nenhum pedido encontrado com esses filtros.'
              : 'Nenhum pedido ainda. Os pedidos feitos na loja aparecem aqui.'
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

      <DetalhesPedido pedido={detalhe} aoFechar={() => setDetalhe(null)} />

      <Modal
        aberto={confirmacao !== null}
        titulo={`Marcar como ${confirmacao ? ROTULO_STATUS[confirmacao.novo].toLowerCase() : ''}`}
        aoFechar={() => setConfirmacao(null)}
        rodape={
          <>
            <Botao
              variante="secundario"
              onClick={() => setConfirmacao(null)}
              disabled={mudarStatus.isPending}
            >
              Cancelar
            </Botao>
            <Botao
              variante={confirmacao?.novo === 'cancelado' ? 'perigo' : 'primario'}
              onClick={() => confirmacao && mudarStatus.mutate(confirmacao)}
              disabled={mudarStatus.isPending}
            >
              {mudarStatus.isPending ? 'Aplicando…' : 'Confirmar'}
            </Botao>
          </>
        }
      >
        <p className="text-sm text-texto-suave">
          Pedido <strong className="text-texto">#{confirmacao?.pedido.numero}</strong>.{' '}
          {confirmacao && consequenciaDoStatus(confirmacao.novo)}
        </p>
      </Modal>

      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir pedido"
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
          Excluir o pedido <strong className="text-texto">#{paraExcluir?.numero}</strong>? O
          histórico dele deixa de existir. O estoque e o financeiro já foram estornados no
          cancelamento.
        </p>
      </Modal>
    </div>
  );
}
