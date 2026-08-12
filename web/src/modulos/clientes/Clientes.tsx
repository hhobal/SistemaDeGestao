import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Tabela, type Coluna } from '@/comum/componentes/Tabela';
import { Paginacao } from '@/comum/componentes/Paginacao';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { FormularioCliente } from './FormularioCliente';
import { useDebounce } from '@/comum/useDebounce';
import { useAuth } from '@/auth/AuthContext';
import { ErroApi } from '@/comum/api';
import { formatarData } from '@/comum/tipos';
import {
  atualizarCliente,
  chavesCliente,
  criarCliente,
  excluirCliente,
  listarClientes,
  STATUS_CLIENTE,
  type Cliente,
  type FormularioCliente as Campos,
  type StatusCliente
} from './api';

const CORES_STATUS: Record<StatusCliente, string> = {
  ativo: 'bg-ok/15 text-ok',
  inativo: 'bg-texto-fraco/20 text-texto-suave',
  inadimplente: 'bg-erro/15 text-erro'
};

export function Clientes() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusCliente | ''>('');
  const [pagina, setPagina] = useState(1);

  const [emEdicao, setEmEdicao] = useState<Cliente | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Cliente | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const buscaAtrasada = useDebounce(busca);
  const filtros = { busca: buscaAtrasada, status, pagina, porPagina: 20 };

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: chavesCliente.lista(filtros),
    queryFn: ({ signal }) => listarClientes(filtros, signal),
    // Mantém a lista anterior visível enquanto a nova carrega: sem isso
    // a tabela pisca em branco a cada letra digitada na busca.
    placeholderData: keepPreviousData
  });

  function aoTerminar() {
    fila.invalidateQueries({ queryKey: chavesCliente.todos });
  }

  const salvar = useMutation({
    mutationFn: (dados: Campos) =>
      emEdicao ? atualizarCliente(emEdicao.id, dados) : criarCliente(dados),
    onSuccess: () => {
      aoTerminar();
      setFormularioAberto(false);
      setEmEdicao(null);
    },
    // O servidor rejeita e-mail ou CPF repetido (409). A mensagem dele é
    // mais precisa que qualquer texto genérico daqui.
    onError: erro => setErroFormulario(erro instanceof ErroApi ? erro.message : 'Não foi possível salvar.')
  });

  const excluir = useMutation({
    mutationFn: (cliente: Cliente) => excluirCliente(cliente.id),
    onSuccess: () => {
      aoTerminar();
      setParaExcluir(null);
    },
    // Cliente com pedidos ou O.S. não pode ser excluído; a API explica
    // o motivo e sugere inativar.
    onError: erro => setErroExclusao(erro instanceof ErroApi ? erro.message : 'Não foi possível excluir.')
  });

  function abrirNovo() {
    setEmEdicao(null);
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(cliente: Cliente) {
    setEmEdicao(cliente);
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  const colunas: Coluna<Cliente>[] = [
    {
      cabecalho: 'Nome',
      celula: cliente => (
        <div className="min-w-0">
          <div className="truncate font-medium">{cliente.nome}</div>
          {cliente.cpf && <div className="text-xs text-texto-fraco">{cliente.cpf}</div>}
        </div>
      )
    },
    {
      cabecalho: 'Contato',
      ocultarNoCelular: true,
      celula: cliente => (
        <div className="min-w-0 text-xs">
          <div className="truncate">{cliente.email ?? '—'}</div>
          <div className="text-texto-fraco">{cliente.telefone || '—'}</div>
        </div>
      )
    },
    {
      cabecalho: 'Origem',
      ocultarNoCelular: true,
      celula: cliente => (
        <span className="text-xs text-texto-suave">
          {cliente.origem === 'loja' ? 'Loja virtual' : 'Cadastro manual'}
        </span>
      )
    },
    {
      cabecalho: 'Desde',
      ocultarNoCelular: true,
      celula: cliente => <span className="text-xs">{formatarData(cliente.criadoEm)}</span>
    },
    {
      cabecalho: 'Status',
      celula: cliente => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${CORES_STATUS[cliente.status]}`}>
          {cliente.status}
        </span>
      )
    },
    {
      cabecalho: '',
      alinhamento: 'direita',
      celula: cliente =>
        podeEscrever ? (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => abrirEdicao(cliente)}
              aria-label={`Editar ${cliente.nome}`}
              className="rounded px-2 py-1 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
            >
              Editar
            </button>
            <button
              onClick={() => {
                setErroExclusao(null);
                setParaExcluir(cliente);
              }}
              aria-label={`Excluir ${cliente.nome}`}
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
          <h1 className="text-lg font-semibold">Clientes</h1>
          <p className="text-sm text-texto-suave">Cadastro do ERP e contas da loja virtual</p>
        </div>
        {podeEscrever && <Botao onClick={abrirNovo}>Novo cliente</Botao>}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={busca}
          onChange={evento => {
            setBusca(evento.target.value);
            setPagina(1); // filtro novo recomeça da primeira página
          }}
          placeholder="Buscar por nome, e-mail, telefone ou CPF…"
          aria-label="Buscar clientes"
          className="min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        />
        <select
          value={status}
          onChange={evento => {
            setStatus(evento.target.value as StatusCliente | '');
            setPagina(1);
          }}
          aria-label="Filtrar por status"
          className="rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
        >
          <option value="">Todos os status</option>
          {STATUS_CLIENTE.map(s => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
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
          chave={cliente => cliente.id}
          carregando={isPending}
          vazio={
            buscaAtrasada || status
              ? 'Nenhum cliente encontrado com esses filtros.'
              : 'Nenhum cliente cadastrado ainda.'
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

      <FormularioCliente
        aberto={formularioAberto}
        cliente={emEdicao}
        salvando={salvar.isPending}
        erro={erroFormulario}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={dados => salvar.mutate(dados)}
      />

      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir cliente"
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
            Excluir <strong className="text-texto">{paraExcluir?.nome}</strong>? Esta ação não pode
            ser desfeita.
          </p>
        )}
      </Modal>
    </div>
  );
}
