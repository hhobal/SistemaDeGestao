import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Botao } from '../componentes/Botao';
import { Modal } from '../componentes/Modal';
import { CampoTexto, CampoArea } from '../componentes/Campo';
import { useAuth } from '../auth/AuthContext';
import { ErroApi } from '../lib/api';
import { formatarData } from '../lib/tipos';
import {
  atualizarNota,
  chavesNota,
  CORES_NOTA,
  criarNota,
  esquemaNota,
  excluirNota,
  listarNotas,
  type DadosNota,
  type Nota
} from '../cadastros/api';

export function Notas() {
  const { podeEscrever } = useAuth();
  const fila = useQueryClient();
  const [emEdicao, setEmEdicao] = useState<Nota | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const notas = useQuery({
    queryKey: chavesNota.todas,
    queryFn: ({ signal }) => listarNotas(signal)
  });

  const aoTerminar = () => fila.invalidateQueries({ queryKey: chavesNota.todas });

  const salvar = useMutation({
    mutationFn: (d: DadosNota) => (emEdicao ? atualizarNota(emEdicao.id, d) : criarNota(d)),
    onSuccess: () => {
      aoTerminar();
      setAberto(false);
      setEmEdicao(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
  });

  const remover = useMutation({
    mutationFn: (id: number) => excluirNota(id),
    onSuccess: aoTerminar,
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Notas</h1>
          <p className="text-sm text-texto-suave">Lembretes rápidos da equipe</p>
        </div>
        {podeEscrever && (
          <Botao
            onClick={() => {
              setEmEdicao(null);
              setErro(null);
              setAberto(true);
            }}
          >
            Nova nota
          </Botao>
        )}
      </div>

      {erro && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {erro}
        </div>
      )}

      {notas.isPending && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-cartao" />
          ))}
        </div>
      )}

      {notas.data?.length === 0 && (
        <p className="rounded-xl border border-borda bg-cartao p-10 text-center text-sm text-texto-fraco">
          Nenhuma nota ainda.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notas.data?.map(nota => (
          <article
            key={nota.id}
            className="flex flex-col rounded-xl border border-borda p-4"
            // A cor vem do banco e é escolhida numa lista fechada no
            // formulário; não há entrada livre de CSS aqui.
            style={{ backgroundColor: nota.cor ?? '#1e2430' }}
          >
            <h2 className="font-semibold">{nota.titulo}</h2>
            <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-texto-suave">
              {nota.conteudo}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-texto-fraco">
              <span>{formatarData(nota.criadoEm)}</span>
              {podeEscrever && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEmEdicao(nota);
                      setErro(null);
                      setAberto(true);
                    }}
                    aria-label={`Editar ${nota.titulo}`}
                    className="hover:text-texto"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remover.mutate(nota.id)}
                    aria-label={`Excluir ${nota.titulo}`}
                    className="hover:text-erro"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <FormularioNota
        aberto={aberto}
        nota={emEdicao}
        salvando={salvar.isPending}
        aoFechar={() => setAberto(false)}
        aoSalvar={d => salvar.mutate(d)}
      />
    </div>
  );
}

function FormularioNota({
  aberto,
  nota,
  salvando,
  aoFechar,
  aoSalvar
}: {
  aberto: boolean;
  nota: Nota | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (d: DadosNota) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<DadosNota>({
    resolver: zodResolver(esquemaNota),
    defaultValues: { titulo: '', conteudo: '', cor: CORES_NOTA[0] }
  });

  useEffect(() => {
    if (!aberto) return;
    reset({
      titulo: nota?.titulo ?? '',
      conteudo: nota?.conteudo ?? '',
      cor: nota?.cor ?? CORES_NOTA[0]
    });
  }, [aberto, nota, reset]);

  const corEscolhida = watch('cor');

  return (
    <Modal
      aberto={aberto}
      titulo={nota ? 'Editar nota' : 'Nova nota'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-nota" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </>
      }
    >
      <form id="form-nota" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto id="titulo" rotulo="Título" autoFocus erro={errors.titulo?.message} {...register('titulo')} />
        <CampoArea id="conteudo" rotulo="Conteúdo" rows={5} {...register('conteudo')} />

        <div>
          <span className="mb-1 block text-xs text-texto-suave">Cor</span>
          {/* Lista fechada em vez de campo livre: mantém a aparência
              coerente e impede injetar valor arbitrário no style. */}
          <div className="flex gap-2">
            {CORES_NOTA.map(cor => (
              <button
                key={cor}
                type="button"
                onClick={() => setValue('cor', cor)}
                aria-label={`Cor ${cor}`}
                aria-pressed={corEscolhida === cor}
                style={{ backgroundColor: cor }}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  corEscolhida === cor ? 'border-marca' : 'border-borda'
                }`}
              />
            ))}
          </div>
          <input type="hidden" {...register('cor')} />
        </div>
      </form>
    </Modal>
  );
}
