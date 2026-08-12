import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { CampoTexto, CampoSelecao, CampoArea } from '@/comum/componentes/Campo';
import { useAuth } from '@/auth/AuthContext';
import { ErroApi } from '@/comum/api';
import { formatarData } from '@/comum/tipos';
import {
  atualizarTarefa,
  chavesTarefa,
  COLUNAS_KANBAN,
  criarTarefa,
  esquemaTarefa,
  excluirTarefa,
  listarTarefas,
  moverTarefa,
  PRIORIDADES_TAREFA,
  tarefaAtrasada,
  type DadosTarefa,
  type PrioridadeTarefa,
  type StatusTarefa,
  type Tarefa
} from './api';

const CORES_PRIORIDADE: Record<PrioridadeTarefa, string> = {
  baixa: 'text-texto-fraco',
  media: 'text-aviso',
  alta: 'text-erro'
};

export function Tarefas() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();
  const [emEdicao, setEmEdicao] = useState<Tarefa | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tarefas = useQuery({
    queryKey: chavesTarefa.todas,
    queryFn: ({ signal }) => listarTarefas(signal)
  });

  const aoTerminar = () => fila.invalidateQueries({ queryKey: chavesTarefa.todas });

  const salvar = useMutation({
    mutationFn: (d: DadosTarefa) => (emEdicao ? atualizarTarefa(emEdicao.id, d) : criarTarefa(d)),
    onSuccess: () => {
      aoTerminar();
      setAberto(false);
      setEmEdicao(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
  });

  const mover = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusTarefa }) => moverTarefa(id, status),
    onSuccess: aoTerminar,
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível mover.')
  });

  const remover = useMutation({
    mutationFn: (id: number) => excluirTarefa(id),
    onSuccess: aoTerminar,
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  const lista = tarefas.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Tarefas</h1>
          <p className="text-sm text-texto-suave">Quadro da equipe</p>
        </div>
        {podeEscrever && (
          <Botao
            onClick={() => {
              setEmEdicao(null);
              setErro(null);
              setAberto(true);
            }}
          >
            Nova tarefa
          </Botao>
        )}
      </div>

      {erro && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {erro}
        </div>
      )}

      {tarefas.isPending ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUNAS_KANBAN.map(c => (
            <div key={c.id} className="h-64 animate-pulse rounded-xl bg-cartao" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUNAS_KANBAN.map(coluna => {
            const daColuna = lista.filter(t => t.status === coluna.id);
            return (
              <section key={coluna.id} className="rounded-xl border border-borda bg-cartao">
                <header className="flex items-center justify-between border-b border-borda px-3 py-2">
                  <h2 className="text-sm font-semibold">{coluna.rotulo}</h2>
                  <span className="rounded-full bg-realce px-2 py-0.5 text-xs text-texto-suave">
                    {daColuna.length}
                  </span>
                </header>

                <ul className="space-y-2 p-2">
                  {daColuna.length === 0 && (
                    <li className="py-6 text-center text-xs text-texto-fraco">Nenhuma tarefa</li>
                  )}

                  {daColuna.map(tarefa => (
                    <li key={tarefa.id} className="rounded-lg border border-borda bg-superficie p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[10px] font-bold uppercase ${CORES_PRIORIDADE[tarefa.prioridade]}`}>
                          {tarefa.prioridade}
                        </span>
                        {podeEscrever && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEmEdicao(tarefa);
                                setErro(null);
                                setAberto(true);
                              }}
                              aria-label={`Editar ${tarefa.titulo}`}
                              className="text-xs text-texto-fraco hover:text-texto"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => remover.mutate(tarefa.id)}
                              aria-label={`Excluir ${tarefa.titulo}`}
                              className="text-xs text-texto-fraco hover:text-erro"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="mt-1 text-sm">{tarefa.titulo}</p>
                      {tarefa.descricao && (
                        <p className="mt-1 line-clamp-2 text-xs text-texto-fraco">{tarefa.descricao}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-texto-fraco">
                        {tarefa.responsavel && <span>{tarefa.responsavel.nome.split(' ')[0]}</span>}
                        {tarefa.dataLimite && (
                          <span className={tarefaAtrasada(tarefa) ? 'text-erro' : ''}>
                            {formatarData(tarefa.dataLimite)}
                            {tarefaAtrasada(tarefa) && ' · atrasada'}
                          </span>
                        )}
                      </div>

                      {/* Um <select> em vez de arrastar: funciona no
                          celular e com teclado, onde o arrastar não
                          funciona. */}
                      {podeEscrever && (
                        <select
                          value={tarefa.status}
                          onChange={e =>
                            mover.mutate({ id: tarefa.id, status: e.target.value as StatusTarefa })
                          }
                          aria-label={`Mover ${tarefa.titulo}`}
                          className="mt-2 w-full rounded border border-borda bg-fundo px-2 py-1 text-xs outline-none focus:border-marca"
                        >
                          {COLUNAS_KANBAN.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.rotulo}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <FormularioTarefa
        aberto={aberto}
        tarefa={emEdicao}
        salvando={salvar.isPending}
        aoFechar={() => setAberto(false)}
        aoSalvar={d => salvar.mutate(d)}
      />
    </div>
  );
}

function FormularioTarefa({
  aberto,
  tarefa,
  salvando,
  aoFechar,
  aoSalvar
}: {
  aberto: boolean;
  tarefa: Tarefa | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (d: DadosTarefa) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DadosTarefa>({
    resolver: zodResolver(esquemaTarefa),
    defaultValues: { titulo: '', descricao: '', prioridade: 'media', status: 'backlog', dataLimite: '' }
  });

  useEffect(() => {
    if (!aberto) return;
    reset({
      titulo: tarefa?.titulo ?? '',
      descricao: tarefa?.descricao ?? '',
      prioridade: tarefa?.prioridade ?? 'media',
      status: tarefa?.status ?? 'backlog',
      dataLimite: tarefa?.dataLimite ? String(tarefa.dataLimite).slice(0, 10) : ''
    });
  }, [aberto, tarefa, reset]);

  return (
    <Modal
      aberto={aberto}
      titulo={tarefa ? 'Editar tarefa' : 'Nova tarefa'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-tarefa" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </>
      }
    >
      <form id="form-tarefa" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto id="titulo" rotulo="Título" autoFocus erro={errors.titulo?.message} {...register('titulo')} />
        <CampoArea id="descricao" rotulo="Descrição" {...register('descricao')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSelecao
            id="prioridade"
            rotulo="Prioridade"
            opcoes={PRIORIDADES_TAREFA.map(p => ({ valor: p, rotulo: p }))}
            {...register('prioridade')}
          />
          <CampoSelecao
            id="status"
            rotulo="Coluna"
            opcoes={COLUNAS_KANBAN.map(c => ({ valor: c.id, rotulo: c.rotulo }))}
            {...register('status')}
          />
        </div>
        <CampoTexto id="dataLimite" rotulo="Prazo (opcional)" type="date" {...register('dataLimite')} />
      </form>
    </Modal>
  );
}
