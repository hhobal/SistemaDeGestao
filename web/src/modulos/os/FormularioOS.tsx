import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CampoTexto, CampoSelecao, CampoArea } from '@/comum/componentes/Campo';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { api, ErroApi } from '@/comum/api';
import type { Paginado } from '@/comum/tipos';
import {
  esquemaOS,
  PRIORIDADES,
  ROTULO_PRIORIDADE,
  type DadosOS,
  type FormularioOS as Campos,
  type OrdemServico
} from './api';

type Props = {
  aberto: boolean;
  os: OrdemServico | null;
  salvando: boolean;
  erro?: string | null;
  aoFechar: () => void;
  aoSalvar: (dados: DadosOS) => void;
};

const VAZIO: Campos = {
  titulo: '',
  descricao: '',
  observacao: '',
  prioridade: 'normal',
  valor: 0,
  clienteId: '',
  responsavelId: ''
};

type Opcao = { id: number; nome: string };

export function FormularioOS({ aberto, os, salvando, erro, aoFechar, aoSalvar }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<Campos, unknown, DadosOS>({
    resolver: zodResolver(esquemaOS),
    defaultValues: VAZIO
  });

  // Lista grande o bastante para cobrir o cadastro inteiro sem paginar
  // dentro de um select.
  const { data: clientes } = useQuery({
    queryKey: ['clientes', 'opcoes'],
    queryFn: () => api.get<Paginado<Opcao>>('/clientes?porPagina=100'),
    enabled: aberto,
    staleTime: 60_000
  });

  // /usuarios exige perfil Administrador. Um Operador recebe 403 aqui,
  // e isso não é falha: ele só não escolhe responsável. Sem o retry
  // desligado, a tela ficaria tentando de novo à toa.
  const usuarios = useQuery({
    queryKey: ['usuarios', 'opcoes'],
    queryFn: () => api.get<Opcao[]>('/usuarios'),
    enabled: aberto,
    retry: false,
    staleTime: 60_000
  });

  const semPermissaoParaResponsavel =
    usuarios.error instanceof ErroApi && usuarios.error.status === 403;

  useEffect(() => {
    if (!aberto) return;
    reset(
      os
        ? {
            titulo: os.titulo,
            descricao: os.descricao ?? '',
            observacao: os.observacao ?? '',
            prioridade: os.prioridade,
            valor: Number(os.valor),
            clienteId: os.clienteId ?? '',
            responsavelId: os.responsavelId ?? ''
          }
        : VAZIO
    );
  }, [aberto, os, reset]);

  return (
    <Modal
      aberto={aberto}
      titulo={os ? `Editar O.S. #${os.numero}` : 'Nova ordem de serviço'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-os" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </>
      }
    >
      {erro && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro"
        >
          {erro}
        </div>
      )}

      <form id="form-os" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto
          id="titulo"
          rotulo="Título do serviço"
          autoFocus
          placeholder="Ex.: Troca de tela de notebook"
          erro={errors.titulo?.message}
          {...register('titulo')}
        />

        <CampoArea
          id="descricao"
          rotulo="Descrição"
          placeholder="O que será feito"
          {...register('descricao')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSelecao
            id="clienteId"
            rotulo="Cliente"
            opcoes={[
              { valor: '', rotulo: 'Sem cliente vinculado' },
              ...(clientes?.itens ?? []).map(c => ({ valor: String(c.id), rotulo: c.nome }))
            ]}
            {...register('clienteId')}
          />

          {semPermissaoParaResponsavel ? (
            <div>
              <label className="mb-1 block text-xs text-texto-suave">Responsável</label>
              <div className="rounded-lg border border-borda bg-fundo px-3 py-2 text-sm text-texto-fraco">
                {os?.responsavel?.nome ?? 'Definido por um administrador'}
              </div>
            </div>
          ) : (
            <CampoSelecao
              id="responsavelId"
              rotulo="Responsável"
              opcoes={[
                { valor: '', rotulo: 'Sem responsável' },
                ...(usuarios.data ?? []).map(u => ({ valor: String(u.id), rotulo: u.nome }))
              ]}
              {...register('responsavelId')}
            />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSelecao
            id="prioridade"
            rotulo="Prioridade"
            opcoes={PRIORIDADES.map(p => ({ valor: p, rotulo: ROTULO_PRIORIDADE[p] }))}
            {...register('prioridade')}
          />
          <CampoTexto
            id="valor"
            rotulo="Valor do serviço (R$)"
            type="number"
            step="0.01"
            min="0"
            erro={errors.valor?.message}
            {...register('valor')}
          />
        </div>

        <p className="text-xs text-texto-fraco">
          Ao concluir a O.S., este valor vira uma receita paga em Finanças.
        </p>

        <CampoArea
          id="observacao"
          rotulo="Observação interna"
          placeholder="Não aparece para o cliente"
          {...register('observacao')}
        />
      </form>
    </Modal>
  );
}
