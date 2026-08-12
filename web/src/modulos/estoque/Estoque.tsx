import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Tabela, type Coluna } from '@/comum/componentes/Tabela';
import { Paginacao } from '@/comum/componentes/Paginacao';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { CampoTexto, CampoSelecao } from '@/comum/componentes/Campo';
import { useAuth } from '@/auth/AuthContext';
import { api, ErroApi } from '@/comum/api';
import { formatarData, formatarMoeda } from '@/comum/tipos';
import type { Paginado } from '@/comum/tipos';
import {
  chavesEstoque,
  esquemaMovimento,
  listarCriticos,
  listarMovimentos,
  obterResumoEstoque,
  origemDoMovimento,
  registrarMovimento,
  TIPOS_MOVIMENTO,
  validarSaida,
  type DadosMovimento,
  type FormularioMovimento,
  type Movimento
} from './api';

type ProdutoOpcao = { id: number; nome: string; codigo: string | null; estoque: number };

export function Estoque() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [formularioAberto, setFormularioAberto] = useState(false);

  const resumo = useQuery({ queryKey: chavesEstoque.resumo, queryFn: obterResumoEstoque });
  const criticos = useQuery({ queryKey: chavesEstoque.criticos, queryFn: listarCriticos });

  const movimentos = useQuery({
    queryKey: chavesEstoque.movimentos(pagina),
    queryFn: ({ signal }) => listarMovimentos(pagina, signal),
    placeholderData: keepPreviousData
  });

  const colunas: Coluna<Movimento>[] = [
    {
      cabecalho: 'Produto',
      celula: m => (
        <div className="min-w-0">
          <div className="truncate">{m.produto?.nome ?? `Produto #${m.produtoId}`}</div>
          {m.produto?.codigo && (
            <div className="font-mono text-xs text-texto-fraco">{m.produto.codigo}</div>
          )}
        </div>
      )
    },
    {
      cabecalho: 'Movimento',
      celula: m => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            m.tipo === 'entrada' ? 'bg-ok/15 text-ok' : 'bg-erro/15 text-erro'
          }`}
        >
          {m.tipo === 'entrada' ? '+' : '−'} {m.quantidade}
        </span>
      )
    },
    {
      cabecalho: 'Motivo',
      ocultarNoCelular: true,
      celula: m => (
        <div className="min-w-0 text-xs">
          <div className="truncate text-texto-suave">{m.motivo || '—'}</div>
          {/* Deixa visível o que veio da loja e o que foi ajuste manual. */}
          {origemDoMovimento(m) === 'pedido' && (
            <span className="text-[10px] text-texto-fraco">automático</span>
          )}
        </div>
      )
    },
    {
      cabecalho: 'Responsável',
      ocultarNoCelular: true,
      celula: m => <span className="text-xs text-texto-suave">{m.responsavel ?? '—'}</span>
    },
    {
      cabecalho: 'Data',
      alinhamento: 'direita',
      celula: m => <span className="text-xs">{formatarData(m.data)}</span>
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Estoque</h1>
          <p className="text-sm text-texto-suave">
            O saldo é consequência dos movimentos — vendas da loja entram aqui automaticamente.
          </p>
        </div>
        {podeEscrever && <Botao onClick={() => setFormularioAberto(true)}>Registrar movimento</Botao>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card rotulo="Produtos ativos" valor={resumo.data?.totalProdutos ?? '—'} />
        <Card
          rotulo="Valor em estoque"
          valor={resumo.data ? formatarMoeda(resumo.data.valorTotalEstoque) : '—'}
        />
        <Card
          rotulo="Abaixo do mínimo"
          valor={resumo.data?.criticos ?? '—'}
          cor={resumo.data && resumo.data.criticos > 0 ? 'text-aviso' : ''}
        />
        <Card
          rotulo="Esgotados"
          valor={resumo.data?.zerados ?? '—'}
          cor={resumo.data && resumo.data.zerados > 0 ? 'text-erro' : ''}
        />
      </div>

      {criticos.data && criticos.data.length > 0 && (
        <section className="rounded-xl border border-aviso/30 bg-aviso/5 p-4">
          <h2 className="mb-2 text-sm font-semibold text-aviso">
            {criticos.data.length} produto(s) precisando de reposição
          </h2>
          <ul className="space-y-1 text-sm">
            {criticos.data.map(p => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="truncate">{p.nome}</span>
                <span className="shrink-0 text-texto-suave">
                  {p.estoque} <span className="text-texto-fraco">/ mín. {p.estoqueMin}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-texto-suave">Histórico de movimentações</h2>
        <div
          className={`rounded-xl border border-borda bg-cartao transition-opacity ${
            movimentos.isFetching && !movimentos.isPending ? 'opacity-60' : ''
          }`}
        >
          <Tabela
            colunas={colunas}
            itens={movimentos.data?.itens ?? []}
            chave={m => m.id}
            carregando={movimentos.isPending}
            vazio="Nenhuma movimentação registrada ainda."
          />
          {movimentos.data && (
            <div className="border-t border-borda">
              <Paginacao
                pagina={movimentos.data.paginacao.pagina}
                totalPaginas={movimentos.data.paginacao.totalPaginas}
                total={movimentos.data.paginacao.total}
                aoMudar={setPagina}
              />
            </div>
          )}
        </div>
      </div>

      <FormularioMovimentoModal
        aberto={formularioAberto}
        aoFechar={() => setFormularioAberto(false)}
        aoConcluir={() => {
          // Movimento muda saldo: produtos e dashboard também mudam.
          fila.invalidateQueries({ queryKey: chavesEstoque.todas });
          fila.invalidateQueries({ queryKey: ['produtos'] });
          fila.invalidateQueries({ queryKey: ['dashboard'] });
          setFormularioAberto(false);
        }}
      />
    </div>
  );
}

function Card({ rotulo, valor, cor = '' }: { rotulo: string; valor: string | number; cor?: string }) {
  return (
    <div className="rounded-xl border border-borda bg-cartao p-3">
      <div className="text-xs text-texto-suave">{rotulo}</div>
      <div className={`mt-1 text-xl font-bold ${cor}`}>{valor}</div>
    </div>
  );
}

function FormularioMovimentoModal({
  aberto,
  aoFechar,
  aoConcluir
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);

  const { data: produtos } = useQuery({
    queryKey: ['produtos', 'opcoes-estoque'],
    queryFn: () => api.get<Paginado<ProdutoOpcao>>('/produtos?porPagina=100'),
    enabled: aberto,
    staleTime: 30_000
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<FormularioMovimento, unknown, DadosMovimento>({
    resolver: zodResolver(esquemaMovimento),
    defaultValues: { produtoId: '', tipo: 'entrada', quantidade: 1, motivo: '' }
  });

  // Avisa antes de enviar que a saída deixaria o estoque negativo.
  const produtoId = useWatch({ control, name: 'produtoId' });
  const tipo = useWatch({ control, name: 'tipo' });
  const quantidade = useWatch({ control, name: 'quantidade' });
  const escolhido = produtos?.itens.find(p => p.id === Number(produtoId));
  const avisoSaida = escolhido
    ? validarSaida(tipo, Number(quantidade) || 0, escolhido.estoque)
    : null;

  const salvar = useMutation({
    mutationFn: registrarMovimento,
    onSuccess: () => {
      reset();
      aoConcluir();
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível registrar.')
  });

  return (
    <Modal
      aberto={aberto}
      titulo="Registrar movimento"
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvar.isPending}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-movimento" disabled={salvar.isPending || !!avisoSaida}>
            {salvar.isPending ? 'Registrando…' : 'Registrar'}
          </Botao>
        </>
      }
    >
      {erro && (
        <div role="alert" className="mb-4 rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro">
          {erro}
        </div>
      )}

      <form
        id="form-movimento"
        onSubmit={handleSubmit(dados => {
          setErro(null);
          salvar.mutate(dados);
        })}
        noValidate
        className="space-y-3"
      >
        <CampoSelecao
          id="produtoId"
          rotulo="Produto"
          erro={errors.produtoId?.message}
          opcoes={[
            { valor: '', rotulo: 'Escolha o produto' },
            ...(produtos?.itens ?? []).map(p => ({
              valor: String(p.id),
              rotulo: `${p.nome} — ${p.estoque} em estoque`
            }))
          ]}
          {...register('produtoId')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSelecao
            id="tipo"
            rotulo="Tipo"
            opcoes={TIPOS_MOVIMENTO.map(t => ({
              valor: t,
              rotulo: t === 'entrada' ? 'Entrada (compra, devolução)' : 'Saída (venda, perda)'
            }))}
            {...register('tipo')}
          />
          <CampoTexto
            id="quantidade"
            rotulo="Quantidade"
            type="number"
            min="1"
            erro={errors.quantidade?.message}
            {...register('quantidade')}
          />
        </div>

        {avisoSaida && (
          <div className="rounded-lg border border-aviso/40 bg-aviso/10 px-3 py-2 text-xs text-aviso">
            {avisoSaida}
          </div>
        )}

        <CampoTexto
          id="motivo"
          rotulo="Motivo"
          placeholder="Ex.: Compra do fornecedor Nexus"
          {...register('motivo')}
        />
      </form>
    </Modal>
  );
}
