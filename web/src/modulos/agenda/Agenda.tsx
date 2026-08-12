import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { CampoTexto, CampoSelecao, CampoArea } from '@/comum/componentes/Campo';
import { useAuth } from '@/auth/AuthContext';
import { ErroApi } from '@/comum/api';
import {
  atualizarEvento,
  chavesEvento,
  criarEvento,
  diaDoEvento,
  esquemaEvento,
  eventoJaPassou,
  excluirEvento,
  listarEventos,
  ROTULO_EVENTO,
  TIPOS_EVENTO,
  type DadosEvento,
  type Evento,
  type TipoEvento
} from './api';

const CORES_TIPO: Record<TipoEvento, string> = {
  reuniao: 'bg-info/15 text-info',
  tarefa: 'bg-aviso/15 text-aviso',
  compromisso: 'bg-ok/15 text-ok',
  outro: 'bg-realce text-texto-suave'
};

export function Agenda() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();
  const [emEdicao, setEmEdicao] = useState<Evento | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const eventos = useQuery({
    queryKey: chavesEvento.todos,
    queryFn: ({ signal }) => listarEventos(signal)
  });

  const aoTerminar = () => fila.invalidateQueries({ queryKey: chavesEvento.todos });

  const salvar = useMutation({
    mutationFn: (d: DadosEvento) => (emEdicao ? atualizarEvento(emEdicao.id, d) : criarEvento(d)),
    onSuccess: () => {
      aoTerminar();
      setAberto(false);
      setEmEdicao(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
  });

  const remover = useMutation({
    mutationFn: (id: number) => excluirEvento(id),
    onSuccess: aoTerminar,
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  const lista = [...(eventos.data ?? [])].sort((a, b) =>
    diaDoEvento(a.data).localeCompare(diaDoEvento(b.data))
  );
  // As chamadas passam só o evento: usar `filter(eventoJaPassou)` direto
  // entregaria o índice do array no segundo parâmetro, que a função usa
  // como "hoje" — e a comparação de datas viraria lixo.
  const futuros = lista.filter(e => !eventoJaPassou(e));
  const passados = lista.filter(e => eventoJaPassou(e)).reverse();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Agenda</h1>
          <p className="text-sm text-texto-suave">Compromissos e reuniões da equipe</p>
        </div>
        {podeEscrever && (
          <Botao
            onClick={() => {
              setEmEdicao(null);
              setErro(null);
              setAberto(true);
            }}
          >
            Novo evento
          </Botao>
        )}
      </div>

      {erro && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {erro}
        </div>
      )}

      {eventos.isPending && <div className="h-40 animate-pulse rounded-xl bg-cartao" />}

      {eventos.data && (
        <>
          <Secao
            titulo="Próximos"
            eventos={futuros}
            vazio="Nenhum compromisso à frente."
            podeEscrever={podeEscrever}
            aoEditar={e => {
              setEmEdicao(e);
              setErro(null);
              setAberto(true);
            }}
            aoExcluir={id => remover.mutate(id)}
          />

          {passados.length > 0 && (
            <Secao
              titulo="Já aconteceram"
              eventos={passados.slice(0, 10)}
              vazio=""
              esmaecido
              podeEscrever={podeEscrever}
              aoEditar={e => {
                setEmEdicao(e);
                setErro(null);
                setAberto(true);
              }}
              aoExcluir={id => remover.mutate(id)}
            />
          )}
        </>
      )}

      <FormularioEvento
        aberto={aberto}
        evento={emEdicao}
        salvando={salvar.isPending}
        aoFechar={() => setAberto(false)}
        aoSalvar={d => salvar.mutate(d)}
      />
    </div>
  );
}

function Secao({
  titulo,
  eventos,
  vazio,
  esmaecido = false,
  podeEscrever,
  aoEditar,
  aoExcluir
}: {
  titulo: string;
  eventos: Evento[];
  vazio: string;
  esmaecido?: boolean;
  podeEscrever: boolean;
  aoEditar: (e: Evento) => void;
  aoExcluir: (id: number) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-texto-suave">{titulo}</h2>

      {eventos.length === 0 ? (
        <p className="rounded-xl border border-borda bg-cartao p-8 text-center text-sm text-texto-fraco">
          {vazio}
        </p>
      ) : (
        <ul className={`space-y-2 ${esmaecido ? 'opacity-60' : ''}`}>
          {eventos.map(evento => (
            <li
              key={evento.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-borda bg-cartao p-3"
            >
              <div className="w-16 shrink-0 text-center">
                <div className="text-lg font-bold leading-none">
                  {diaDoEvento(evento.data).slice(8, 10)}
                </div>
                <div className="text-[10px] uppercase text-texto-fraco">
                  {new Date(`${diaDoEvento(evento.data)}T12:00:00`).toLocaleDateString('pt-BR', {
                    month: 'short'
                  })}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{evento.titulo}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-texto-fraco">
                  <span className={`rounded px-1.5 py-0.5 ${CORES_TIPO[evento.tipo]}`}>
                    {ROTULO_EVENTO[evento.tipo]}
                  </span>
                  {evento.hora && <span>{evento.hora}</span>}
                  {evento.descricao && <span className="truncate">{evento.descricao}</span>}
                </div>
              </div>

              {podeEscrever && (
                <div className="flex gap-1">
                  <button
                    onClick={() => aoEditar(evento)}
                    aria-label={`Editar ${evento.titulo}`}
                    className="rounded px-2 py-1 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => aoExcluir(evento.id)}
                    aria-label={`Excluir ${evento.titulo}`}
                    className="rounded px-2 py-1 text-xs text-erro transition hover:bg-erro/10"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FormularioEvento({
  aberto,
  evento,
  salvando,
  aoFechar,
  aoSalvar
}: {
  aberto: boolean;
  evento: Evento | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (d: DadosEvento) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DadosEvento>({
    resolver: zodResolver(esquemaEvento),
    defaultValues: { titulo: '', data: '', hora: '', descricao: '', tipo: 'compromisso' }
  });

  useEffect(() => {
    if (!aberto) return;
    reset({
      titulo: evento?.titulo ?? '',
      data: evento ? diaDoEvento(evento.data) : new Date().toISOString().slice(0, 10),
      hora: evento?.hora ?? '',
      descricao: evento?.descricao ?? '',
      tipo: evento?.tipo ?? 'compromisso'
    });
  }, [aberto, evento, reset]);

  return (
    <Modal
      aberto={aberto}
      titulo={evento ? 'Editar evento' : 'Novo evento'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-evento" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </>
      }
    >
      <form id="form-evento" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto id="titulo" rotulo="Título" autoFocus erro={errors.titulo?.message} {...register('titulo')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto id="data" rotulo="Data" type="date" erro={errors.data?.message} {...register('data')} />
          <CampoTexto id="hora" rotulo="Hora" type="time" {...register('hora')} />
        </div>
        <CampoSelecao
          id="tipo"
          rotulo="Tipo"
          opcoes={TIPOS_EVENTO.map(t => ({ valor: t, rotulo: ROTULO_EVENTO[t] }))}
          {...register('tipo')}
        />
        <CampoArea id="descricao" rotulo="Descrição" {...register('descricao')} />
      </form>
    </Modal>
  );
}
