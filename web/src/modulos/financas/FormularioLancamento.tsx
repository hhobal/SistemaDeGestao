import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { CampoTexto, CampoSelecao } from '@/comum/componentes/Campo';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import {
  esquemaLancamento,
  STATUS_LANCAMENTO,
  TIPOS,
  type DadosLancamento,
  type FormularioLancamento as Campos,
  type Lancamento
} from './api';

type Props = {
  aberto: boolean;
  lancamento: Lancamento | null;
  salvando: boolean;
  erro?: string | null;
  aoFechar: () => void;
  aoSalvar: (dados: DadosLancamento) => void;
};

/** Data de hoje no formato que <input type="date"> espera. */
function hoje() {
  const d = new Date();
  // toISOString converte para UTC e pode "voltar um dia" à noite no
  // Brasil. Montar a partir dos componentes locais evita isso.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function FormularioLancamento({
  aberto,
  lancamento,
  salvando,
  erro,
  aoFechar,
  aoSalvar
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<Campos, unknown, DadosLancamento>({
    resolver: zodResolver(esquemaLancamento),
    defaultValues: {
      descricao: '',
      categoria: '',
      tipo: 'receita',
      valor: '',
      status: 'pendente',
      data: hoje()
    }
  });

  useEffect(() => {
    if (!aberto) return;
    reset(
      lancamento
        ? {
            descricao: lancamento.descricao,
            categoria: lancamento.categoria ?? '',
            tipo: lancamento.tipo,
            valor: Number(lancamento.valor),
            status: lancamento.status,
            data: lancamento.data.slice(0, 10)
          }
        : {
            descricao: '',
            categoria: '',
            tipo: 'receita',
            valor: '',
            status: 'pendente',
            data: hoje()
          }
    );
  }, [aberto, lancamento, reset]);

  return (
    <Modal
      aberto={aberto}
      titulo={lancamento ? 'Editar lançamento' : 'Novo lançamento'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-lancamento" disabled={salvando}>
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

      <form id="form-lancamento" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto
          id="descricao"
          rotulo="Descrição"
          autoFocus
          placeholder="Ex.: Aluguel da loja — agosto"
          erro={errors.descricao?.message}
          {...register('descricao')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSelecao
            id="tipo"
            rotulo="Tipo"
            opcoes={TIPOS.map(t => ({
              valor: t,
              rotulo: t === 'receita' ? 'Receita (entrada)' : 'Despesa (saída)'
            }))}
            {...register('tipo')}
          />
          <CampoTexto
            id="valor"
            rotulo="Valor (R$)"
            type="number"
            step="0.01"
            min="0.01"
            erro={errors.valor?.message}
            {...register('valor')}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto
            id="categoria"
            rotulo="Categoria"
            placeholder="Ex.: Instalações, Pessoal"
            {...register('categoria')}
          />
          <CampoSelecao
            id="status"
            rotulo="Situação"
            opcoes={STATUS_LANCAMENTO.map(s => ({
              valor: s,
              rotulo: s === 'pago' ? 'Pago' : 'Pendente'
            }))}
            {...register('status')}
          />
        </div>

        <CampoTexto
          id="data"
          rotulo="Data"
          type="date"
          erro={errors.data?.message}
          {...register('data')}
        />
      </form>
    </Modal>
  );
}
