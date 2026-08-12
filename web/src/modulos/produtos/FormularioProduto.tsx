import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { CampoTexto, CampoArea } from '@/comum/componentes/Campo';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { formatarMoeda } from '@/comum/tipos';
import {
  esquemaProduto,
  type DadosProduto,
  type FormularioProduto as Campos,
  type Produto
} from './api';

type Props = {
  aberto: boolean;
  produto: Produto | null;
  categorias: string[];
  salvando: boolean;
  erro?: string | null;
  aoFechar: () => void;
  aoSalvar: (dados: DadosProduto) => void;
};

const VAZIO: Campos = {
  nome: '',
  codigo: '',
  categoria: '',
  preco: 0,
  custo: 0,
  estoque: 0,
  estoqueMin: 0,
  descricao: '',
  ativo: true
};

export function FormularioProduto({
  aberto,
  produto,
  categorias,
  salvando,
  erro,
  aoFechar,
  aoSalvar
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors }
  } = useForm<Campos, unknown, DadosProduto>({
    resolver: zodResolver(esquemaProduto),
    defaultValues: VAZIO
  });

  // Mostra a margem enquanto a pessoa digita, para não precisar salvar
  // e voltar só para descobrir que o preço ficou abaixo do custo.
  const precoAtual = useWatch({ control, name: 'preco' });
  const custoAtual = useWatch({ control, name: 'custo' });
  const preco = Number(precoAtual) || 0;
  const custo = Number(custoAtual) || 0;
  const lucro = preco - custo;
  const margemViva = preco > 0 && custo > 0 ? (lucro / preco) * 100 : null;

  useEffect(() => {
    if (!aberto) return;
    reset(
      produto
        ? {
            nome: produto.nome,
            codigo: produto.codigo ?? '',
            categoria: produto.categoria ?? '',
            // O servidor devolve Decimal como string; o <input type=number>
            // precisa de número.
            preco: Number(produto.preco),
            custo: Number(produto.custo),
            estoque: produto.estoque,
            estoqueMin: produto.estoqueMin,
            descricao: produto.descricao ?? '',
            ativo: produto.ativo
          }
        : VAZIO
    );
  }, [aberto, produto, reset]);

  return (
    <Modal
      aberto={aberto}
      titulo={produto ? 'Editar produto' : 'Novo produto'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-produto" disabled={salvando}>
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

      <form id="form-produto" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto
          id="nome"
          rotulo="Nome"
          autoFocus
          erro={errors.nome?.message}
          {...register('nome')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto
            id="codigo"
            rotulo="Código"
            placeholder="Opcional, mas único"
            erro={errors.codigo?.message}
            {...register('codigo')}
          />
          <div>
            <label htmlFor="categoria" className="mb-1 block text-xs text-texto-suave">
              Categoria
            </label>
            {/* datalist deixa escolher uma existente ou digitar nova,
                sem precisar de dois controles diferentes. */}
            <input
              id="categoria"
              list="categorias-existentes"
              className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca"
              {...register('categoria')}
            />
            <datalist id="categorias-existentes">
              {categorias.map(categoria => (
                <option key={categoria} value={categoria} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto
            id="preco"
            rotulo="Preço de venda (R$)"
            type="number"
            step="0.01"
            min="0"
            erro={errors.preco?.message}
            {...register('preco')}
          />
          <CampoTexto
            id="custo"
            rotulo="Custo (R$)"
            type="number"
            step="0.01"
            min="0"
            erro={errors.custo?.message}
            {...register('custo')}
          />
        </div>

        {margemViva !== null && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              margemViva > 0
                ? 'border-ok/30 bg-ok/10 text-ok'
                : 'border-aviso/30 bg-aviso/10 text-aviso'
            }`}
          >
            Margem de {margemViva.toFixed(1)}% · lucro de {formatarMoeda(lucro)} por unidade
            {margemViva <= 0 && ' — o preço está igual ou abaixo do custo'}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto
            id="estoque"
            rotulo="Estoque atual"
            type="number"
            min="0"
            erro={errors.estoque?.message}
            {...register('estoque')}
          />
          <CampoTexto
            id="estoqueMin"
            rotulo="Estoque mínimo"
            type="number"
            min="0"
            erro={errors.estoqueMin?.message}
            {...register('estoqueMin')}
          />
        </div>

        <CampoArea id="descricao" rotulo="Descrição" {...register('descricao')} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-marca" {...register('ativo')} />
          Produto ativo (aparece na loja virtual)
        </label>
      </form>
    </Modal>
  );
}
