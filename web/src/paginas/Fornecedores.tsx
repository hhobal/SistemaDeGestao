import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { Paginacao } from '../componentes/Paginacao';
import { Botao } from '../componentes/Botao';
import { Modal } from '../componentes/Modal';
import { CampoTexto } from '../componentes/Campo';
import { useDebounce } from '../lib/useDebounce';
import { useAuth } from '../auth/AuthContext';
import { ErroApi } from '../lib/api';
import {
  atualizarFornecedor,
  chavesFornecedor,
  criarFornecedor,
  esquemaFornecedor,
  excluirFornecedor,
  listarFornecedores,
  type DadosFornecedor,
  type Fornecedor
} from '../cadastros/api';

export function Fornecedores() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [emEdicao, setEmEdicao] = useState<Fornecedor | null>(null);
  const [aberto, setAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Fornecedor | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscaAtrasada = useDebounce(busca);

  const lista = useQuery({
    queryKey: chavesFornecedor.lista(buscaAtrasada, pagina),
    queryFn: ({ signal }) => listarFornecedores(buscaAtrasada, pagina, signal),
    placeholderData: keepPreviousData
  });

  const aoTerminar = () => fila.invalidateQueries({ queryKey: chavesFornecedor.todos });

  const salvar = useMutation({
    mutationFn: (d: DadosFornecedor) =>
      emEdicao ? atualizarFornecedor(emEdicao.id, d) : criarFornecedor(d),
    onSuccess: () => {
      aoTerminar();
      setAberto(false);
      setEmEdicao(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
  });

  const remover = useMutation({
    mutationFn: (f: Fornecedor) => excluirFornecedor(f.id),
    onSuccess: () => {
      aoTerminar();
      setParaExcluir(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  const colunas: Coluna<Fornecedor>[] = [
    {
      cabecalho: 'Empresa',
      celula: f => (
        <div className="min-w-0">
          <div className="truncate font-medium">{f.empresa}</div>
          {f.cnpj && <div className="font-mono text-xs text-texto-fraco">{f.cnpj}</div>}
        </div>
      )
    },
    {
      cabecalho: 'Contato',
      celula: f => (
        <div className="min-w-0 text-xs">
          <div className="truncate">{f.contato || '—'}</div>
          <div className="text-texto-fraco">{f.telefone || ''}</div>
        </div>
      )
    },
    {
      cabecalho: 'E-mail',
      ocultarNoCelular: true,
      celula: f => <span className="text-xs text-texto-suave">{f.email || '—'}</span>
    },
    {
      cabecalho: 'Categoria',
      ocultarNoCelular: true,
      celula: f => (
        <span className="rounded bg-realce px-2 py-0.5 text-xs text-texto-suave">
          {f.categoria || '—'}
        </span>
      )
    },
    {
      cabecalho: '',
      alinhamento: 'direita',
      celula: f =>
        podeEscrever ? (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => {
                setEmEdicao(f);
                setErro(null);
                setAberto(true);
              }}
              aria-label={`Editar ${f.empresa}`}
              className="rounded px-2 py-1 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
            >
              Editar
            </button>
            <button
              onClick={() => {
                setErro(null);
                setParaExcluir(f);
              }}
              aria-label={`Excluir ${f.empresa}`}
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
          <h1 className="text-lg font-semibold">Fornecedores</h1>
          <p className="text-sm text-texto-suave">Quem abastece o estoque</p>
        </div>
        {podeEscrever && (
          <Botao
            onClick={() => {
              setEmEdicao(null);
              setErro(null);
              setAberto(true);
            }}
          >
            Novo fornecedor
          </Botao>
        )}
      </div>

      <input
        value={busca}
        onChange={e => {
          setBusca(e.target.value);
          setPagina(1);
        }}
        placeholder="Buscar por empresa, contato ou categoria…"
        aria-label="Buscar fornecedores"
        className="w-full rounded-lg border border-borda bg-cartao px-3 py-2 text-sm outline-none focus:border-marca"
      />

      {erro && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {erro}
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
          chave={f => f.id}
          carregando={lista.isPending}
          vazio={buscaAtrasada ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'}
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

      <FormularioFornecedor
        aberto={aberto}
        fornecedor={emEdicao}
        salvando={salvar.isPending}
        aoFechar={() => setAberto(false)}
        aoSalvar={d => salvar.mutate(d)}
      />

      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir fornecedor"
        aoFechar={() => setParaExcluir(null)}
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setParaExcluir(null)} disabled={remover.isPending}>
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
          Excluir <strong className="text-texto">{paraExcluir?.empresa}</strong>?
        </p>
      </Modal>
    </div>
  );
}

function FormularioFornecedor({
  aberto,
  fornecedor,
  salvando,
  aoFechar,
  aoSalvar
}: {
  aberto: boolean;
  fornecedor: Fornecedor | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (d: DadosFornecedor) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DadosFornecedor>({
    resolver: zodResolver(esquemaFornecedor),
    defaultValues: { empresa: '', contato: '', telefone: '', email: '', cnpj: '', categoria: '' }
  });

  useEffect(() => {
    if (!aberto) return;
    reset({
      empresa: fornecedor?.empresa ?? '',
      contato: fornecedor?.contato ?? '',
      telefone: fornecedor?.telefone ?? '',
      email: fornecedor?.email ?? '',
      cnpj: fornecedor?.cnpj ?? '',
      categoria: fornecedor?.categoria ?? ''
    });
  }, [aberto, fornecedor, reset]);

  return (
    <Modal
      aberto={aberto}
      titulo={fornecedor ? 'Editar fornecedor' : 'Novo fornecedor'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-fornecedor" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </>
      }
    >
      <form id="form-fornecedor" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto id="empresa" rotulo="Empresa" autoFocus erro={errors.empresa?.message} {...register('empresa')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto id="contato" rotulo="Pessoa de contato" {...register('contato')} />
          <CampoTexto id="telefone" rotulo="Telefone" {...register('telefone')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto id="email" rotulo="E-mail" type="email" erro={errors.email?.message} {...register('email')} />
          <CampoTexto id="cnpj" rotulo="CNPJ" {...register('cnpj')} />
        </div>
        <CampoTexto id="categoria" rotulo="Categoria" placeholder="Ex.: Componentes" {...register('categoria')} />
      </form>
    </Modal>
  );
}
