import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { CampoTexto, CampoSelecao, CampoArea } from '@/comum/componentes/Campo';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { esquemaCliente, STATUS_CLIENTE, type Cliente, type FormularioCliente as Campos } from './api';

type Props = {
  aberto: boolean;
  /** null = criando; um cliente = editando. */
  cliente: Cliente | null;
  salvando: boolean;
  erro?: string | null;
  aoFechar: () => void;
  aoSalvar: (dados: Campos) => void;
};

const VAZIO: Campos = {
  nome: '',
  email: '',
  telefone: '',
  cpf: '',
  endereco: '',
  observacao: '',
  status: 'ativo'
};

export function FormularioCliente({
  aberto,
  cliente,
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
  } = useForm<Campos>({
    resolver: zodResolver(esquemaCliente),
    defaultValues: VAZIO
  });

  // O modal não é desmontado entre aberturas, então os campos precisam
  // ser recarregados a cada troca de cliente — sem isso, abrir "novo"
  // depois de editar traria os dados do anterior.
  useEffect(() => {
    if (!aberto) return;
    reset(
      cliente
        ? {
            nome: cliente.nome,
            email: cliente.email ?? '',
            telefone: cliente.telefone ?? '',
            cpf: cliente.cpf ?? '',
            endereco: cliente.endereco ?? '',
            observacao: cliente.observacao ?? '',
            status: cliente.status
          }
        : VAZIO
    );
  }, [aberto, cliente, reset]);

  return (
    <Modal
      aberto={aberto}
      titulo={cliente ? 'Editar cliente' : 'Novo cliente'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-cliente" disabled={salvando}>
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

      <form id="form-cliente" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto
          id="nome"
          rotulo="Nome"
          autoFocus
          erro={errors.nome?.message}
          {...register('nome')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto
            id="email"
            rotulo="E-mail"
            type="email"
            erro={errors.email?.message}
            {...register('email')}
          />
          <CampoTexto id="telefone" rotulo="Telefone" {...register('telefone')} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto id="cpf" rotulo="CPF" {...register('cpf')} />
          <CampoSelecao
            id="status"
            rotulo="Status"
            opcoes={STATUS_CLIENTE.map(s => ({
              valor: s,
              rotulo: s.charAt(0).toUpperCase() + s.slice(1)
            }))}
            {...register('status')}
          />
        </div>

        <CampoTexto id="endereco" rotulo="Endereço" {...register('endereco')} />
        <CampoArea id="observacao" rotulo="Observação" {...register('observacao')} />
      </form>
    </Modal>
  );
}
