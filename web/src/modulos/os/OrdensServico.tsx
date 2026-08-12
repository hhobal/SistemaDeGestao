import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Tabela, type Coluna } from '@/comum/componentes/Tabela';
import { Paginacao } from '@/comum/componentes/Paginacao';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { FormularioOS } from './FormularioOS';
import { useDebounce } from '@/comum/useDebounce';
import { useAuth } from '@/auth/AuthContext';
import { ErroApi } from '@/comum/api';
import { formatarData, formatarMoeda } from '@/comum/tipos';
import {
  alterarStatusOS,
  atualizarOS,
  chavesOS,
  consequenciaDoStatusOS,
  criarOS,
  diasEmAberto,
  excluirOS,
  listarOS,
  obterResumoOS,
  podeAlterarStatusOS,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS_OS,
  STATUS_OS,
  type DadosOS,
  type OrdemServico,
  type Prioridade,
  type StatusOS
} from './api';

const CORES_STATUS: Record<StatusOS, string> = {
  aberta: 'bg-aviso/15 text-aviso',
  andamento: 'bg-info/15 text-info',
  concluida: 'bg-ok/15 text-ok',
  cancelada: 'bg-erro/15 text-erro'
};

const CORES_PRIORIDADE: Record<Prioridade, string> = {
  baixa: 'text-texto-fraco',
  normal: 'text-texto-suave',
  alta: 'text-aviso',
  urgente: 'text-erro'
};

export function OrdensServico() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusOS | ''>('');
  const [pagina, setPagina] = useState(1);

  const [emEdicao, setEmEdicao] = useState<OrdemServico | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<OrdemServico | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ os: OrdemServico; novo: StatusOS } | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscaAtrasada = useDebounce(busca);
  const filtros = { busca: buscaAtrasada, status, pagina, porPagina: 20 };

  const lista = useQuery({
    queryKey: chavesOS.lista(filtros),
    queryFn: ({ signal }) => listarOS(filtros, signal),
    placeholderData: keepPreviousData
  });

  const resumo = useQuery({ queryKey: chavesOS.resumo, queryFn: obterResumoOS });

  function aoTerminar() {
    fila.invalidateQueries({ queryKey: chavesOS.todas });
    // Concluir uma O.S. lança receita: o financeiro e o dashboard mudam.
    fila.invalidateQueries({ queryKey: ['dashboard'] });
    fila.invalidateQueries({ queryKey: ['financas'] });
  }

  const salvar = useMutation({
    mutationFn: (dados: DadosOS) => (emEdicao ? atualizarOS(emEdicao.id, dados) : criarOS(dados)),
    onSuccess: () => {
      aoTerminar();
      setFormularioAberto(false);
      setEmEdicao(null);
    },
    onError: e => setErroFormulario(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
  });

  const mudarStatus = useMutation({
    mutationFn: ({ os, novo }: { os: OrdemServico; novo: StatusOS }) => alterarStatusOS(os.id, novo),
    onSuccess: () => {
      aoTerminar();
      setConfirmacao(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível alterar o status.')
  });

  const remover = useMutation({
    mutationFn: (os: OrdemServico) => excluirOS(os.id),
    onSuccess: () => {
      aoTerminar();
      setParaExcluir(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  function pedirConfirmacao(os: OrdemServico, novo: StatusOS) {
    setErro(null);
    if (consequenciaDoStatusOS(novo, os.valor)) setConfirmacao({ os, novo });
    else mudarStatus.mutate({ os, novo });
  }

  const colunas: Coluna<OrdemServico>[] = [
    {
      cabecalho: 'O.S.',
      celula: os => (
        <div>
          <span className="font-mono font-semibold text-marca">#{os.numero}</span>
          <div className={`text-[10px] uppercase ${CORES_PRIORIDADE[os.prioridade]}`}>
            {ROTULO_PRIORIDADE[os.prioridade]}
          </div>
        </div>
      )
    },
    {
      cabecalho: 'Serviço',
      celula: os => {
        const dias = diasEmAberto(os);
        return (
          <div className="min-w-0">
            <div className="truncate font-medium">{os.titulo}</div>
            <div className="truncate text-xs text-texto-fraco">
              {os.cliente?.nome ?? 'Sem cliente'}
              {/* Chamado parado há mais de uma semana merece destaque:
                  é o tipo de coisa que some numa lista longa. */}
              {dias !== null && dias > 7 && (
                <span className="ml-2 text-aviso">· {dias} dias em aberto</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      cabecalho: 'Responsável',
      ocultarNoCelular: true,
      celula: os => (
        <span className="text-xs text-texto-suave">{os.responsavel?.nome ?? '—'}</span>
      )
    },
    {
      cabecalho: 'Abertura',
      ocultarNoCelular: true,
      celula: os => <span className="text-xs">{formatarData(os.dataAbertura)}</span>
    },
    {
      cabecalho: 'Valor',
      alinhamento: 'direita',
      celula: os => <span className="font-semibold">{formatarMoeda(os.valor)}</span>
    },
    {
      cabecalho: 'Situação',
      celula: os =>
        podeEscrever && podeAlterarStatusOS(os) ? (
          <select
            value={os.status}
            onChange={evento => pedirConfirmacao(os, evento.target.value as StatusOS)}
            aria-label={`Situação da O.S. ${os.numero}`}
            className="rounded border border-borda bg-fundo px-2 py-1 text-xs outline-none focus:border-marca"
          >
            {STATUS_OS.map(s => (
              <option key={s} value={s}>
                {ROTULO_STATUS_OS[s]}
              </option>
            ))}
          </select>
        ) : (
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${CORES_STATUS[os.status]}`}>
            {ROTULO_STATUS_OS[os.status]}
          </span>
        )
    },
    {
      cabecalho: '',
      alinhamento: 'direita',
      celula: os =>
        podeEscrever ? (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => {
                setEmEdicao(os);
                setErroFormulario(null);
                setFormularioAberto(true);
              }}
              aria-label={`Editar O.S. ${os.numero}`}
              className="rounded px-2 py-1 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
            >
              Editar
            </button>
            <button
              onClick={() => {
                setErro(null);
                setParaExcluir(os);
              }}
              aria-label={`Excluir O.S. ${os.numero}`}
              className="rounded px-2 py-1 text-xs text-erro transition hover:bg-erro/10"
            >
              Excluir
            </button>
          </div>
        ) : null
    }
  ];

  const cards = [
    { rotulo: 'Abertas', valor: resumo.data?.abertas ?? '—' },
    { rotulo: 'Em andamento', valor: resumo.data?.andamento ?? '—' },
    { rotulo: 'Concluídas', valor: resumo.data?.concluidas ?? '—' },
    { rotulo: 'Faturado', valor: resumo.data ? formatarMoeda(resumo.data.faturado) : '—' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Ordens de Serviço</h1>
          <p className="text-sm text-texto-suave">
            Concluir uma O.S. com valor lança a receita em Finanças automaticamente.
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
            Nova O.S.
          </Botao>
        )}
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
          placeholder="Buscar por número, título ou cliente…"
          aria-label="Buscar ordens de serviço"
          className="min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        />
        <select
          value={status}
          onChange={evento => {
            setStatus(evento.target.value as StatusOS | '');
            setPagina(1);
          }}
          aria-label="Filtrar por situação"
          className="rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        >
          <option value="">Todas as situações</option>
          {STATUS_OS.map(s => (
            <option key={s} value={s}>
              {ROTULO_STATUS_OS[s]}
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
          chave={os => os.id}
          carregando={lista.isPending}
          vazio={
            buscaAtrasada || status
              ? 'Nenhuma O.S. encontrada com esses filtros.'
              : 'Nenhuma ordem de serviço registrada ainda.'
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

      <FormularioOS
        aberto={formularioAberto}
        os={emEdicao}
        salvando={salvar.isPending}
        erro={erroFormulario}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={dados => salvar.mutate(dados)}
      />

      <Modal
        aberto={confirmacao !== null}
        titulo={`Marcar como ${confirmacao ? ROTULO_STATUS_OS[confirmacao.novo].toLowerCase() : ''}`}
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
              variante={confirmacao?.novo === 'cancelada' ? 'perigo' : 'primario'}
              onClick={() => confirmacao && mudarStatus.mutate(confirmacao)}
              disabled={mudarStatus.isPending}
            >
              {mudarStatus.isPending ? 'Aplicando…' : 'Confirmar'}
            </Botao>
          </>
        }
      >
        <p className="text-sm text-texto-suave">
          O.S. <strong className="text-texto">#{confirmacao?.os.numero}</strong>.{' '}
          {confirmacao && consequenciaDoStatusOS(confirmacao.novo, confirmacao.os.valor)}
        </p>
      </Modal>

      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir ordem de serviço"
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
          Excluir a O.S. <strong className="text-texto">#{paraExcluir?.numero}</strong>? Os
          lançamentos financeiros gerados por ela também serão removidos.
        </p>
      </Modal>
    </div>
  );
}
