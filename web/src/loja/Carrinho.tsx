import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { formatarMoeda } from '@/comum/tipos';
import { ErroApi } from '@/comum/api';
import { useCarrinho } from './CarrinhoContext';
import {
  clienteLogado,
  esquemaCheckout,
  finalizarPedido,
  FORMAS_PAGAMENTO,
  ROTULO_PAGAMENTO_LOJA,
  type DadosCheckout,
  type FormularioCheckout,
  type PedidoLoja
} from './api';

export function Carrinho() {
  const { itens, total, mudarQuantidade, remover, esvaziar } = useCarrinho();
  const [concluido, setConcluido] = useState<PedidoLoja | null>(null);

  if (concluido) return <Sucesso pedido={concluido} />;

  if (itens.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-texto-suave">Seu carrinho está vazio.</p>
        <Link
          to="/loja"
          className="mt-4 inline-block rounded-lg bg-marca px-4 py-2 text-sm font-medium text-sobre-marca transition hover:bg-marca-escura"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section>
        <h1 className="mb-4 text-xl font-bold">Seu carrinho</h1>

        <ul className="divide-y divide-borda rounded-xl border border-borda bg-cartao">
          {itens.map(item => (
            <li key={item.produtoId} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{item.nome}</div>
                <div className="text-xs text-texto-fraco">{formatarMoeda(item.preco)} cada</div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => mudarQuantidade(item.produtoId, item.quantidade - 1)}
                  aria-label={`Diminuir ${item.nome}`}
                  className="h-8 w-8 rounded border border-borda transition hover:bg-realce"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm" aria-live="polite">
                  {item.quantidade}
                </span>
                <button
                  onClick={() => mudarQuantidade(item.produtoId, item.quantidade + 1)}
                  aria-label={`Aumentar ${item.nome}`}
                  className="h-8 w-8 rounded border border-borda transition hover:bg-realce"
                >
                  +
                </button>
              </div>

              <div className="w-24 text-right font-semibold">
                {formatarMoeda(item.preco * item.quantidade)}
              </div>

              <button
                onClick={() => remover(item.produtoId)}
                aria-label={`Remover ${item.nome}`}
                className="rounded px-2 py-1 text-xs text-erro transition hover:bg-erro/10"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex justify-between text-sm">
          <button onClick={esvaziar} className="text-texto-fraco underline hover:text-texto-suave">
            Esvaziar carrinho
          </button>
          <Link to="/loja" className="text-marca hover:underline">
            Continuar comprando
          </Link>
        </div>
      </section>

      <Checkout total={total} aoConcluir={setConcluido} />
    </div>
  );
}

function Checkout({
  total,
  aoConcluir
}: {
  total: number;
  aoConcluir: (pedido: PedidoLoja) => void;
}) {
  const { itens, esvaziar } = useCarrinho();
  const navegar = useNavigate();
  const fila = useQueryClient();
  const sessao = clienteLogado();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormularioCheckout, unknown, DadosCheckout>({
    resolver: zodResolver(esquemaCheckout),
    defaultValues: {
      // Pré-preenche com o endereço do cadastro, que é o caso comum.
      enderecoEntrega: sessao?.cliente.endereco ?? '',
      pagamento: 'pix',
      parcelas: 1
    }
  });

  const pagamento = watch('pagamento');

  if (!sessao) {
    return (
      <aside className="h-fit rounded-xl border border-borda bg-cartao p-4">
        <h2 className="font-semibold">Finalizar compra</h2>
        <p className="mt-2 text-sm text-texto-suave">
          Entre na sua conta para concluir o pedido. O carrinho fica guardado.
        </p>
        <Link
          to="/loja/conta"
          className="mt-4 block rounded-lg bg-marca px-4 py-2 text-center text-sm font-medium text-sobre-marca transition hover:bg-marca-escura"
        >
          Entrar ou criar conta
        </Link>
      </aside>
    );
  }

  async function aoEnviar(dados: DadosCheckout) {
    setErro(null);
    try {
      const pedido = await finalizarPedido(itens, dados);
      esvaziar();
      // O pedido acabou de mexer no estoque: o catálogo em cache está
      // desatualizado.
      fila.invalidateQueries({ queryKey: ['loja'] });
      aoConcluir(pedido);
    } catch (e) {
      // O caso mais comum aqui é estoque insuficiente: alguém comprou a
      // última unidade entre a montagem do carrinho e a confirmação. O
      // servidor confere de novo dentro da transação.
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível concluir o pedido.');
      if (e instanceof ErroApi && e.status === 401) navegar('/loja/conta');
    }
  }

  return (
    <aside className="h-fit rounded-xl border border-borda bg-cartao p-4">
      <h2 className="mb-3 font-semibold">Finalizar compra</h2>

      {erro && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro"
        >
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit(aoEnviar)} noValidate className="space-y-3">
        <div>
          <label htmlFor="enderecoEntrega" className="mb-1 block text-xs text-texto-suave">
            Endereço de entrega
          </label>
          <textarea
            id="enderecoEntrega"
            rows={2}
            {...register('enderecoEntrega')}
            aria-invalid={!!errors.enderecoEntrega}
            className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca"
          />
          {errors.enderecoEntrega && (
            <p className="mt-1 text-xs text-erro">{errors.enderecoEntrega.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="pagamento" className="mb-1 block text-xs text-texto-suave">
            Pagamento
          </label>
          <select
            id="pagamento"
            {...register('pagamento')}
            className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca"
          >
            {FORMAS_PAGAMENTO.map(f => (
              <option key={f} value={f}>
                {ROTULO_PAGAMENTO_LOJA[f]}
              </option>
            ))}
          </select>
        </div>

        {/* Parcelamento só faz sentido no cartão. */}
        {pagamento === 'cartao' && (
          <div>
            <label htmlFor="parcelas" className="mb-1 block text-xs text-texto-suave">
              Parcelas
            </label>
            <select
              id="parcelas"
              {...register('parcelas')}
              className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca"
            >
              {[1, 2, 3, 6, 12].map(n => (
                <option key={n} value={n}>
                  {n}× de {formatarMoeda(total / n)}
                  {n === 1 ? ' à vista' : ' sem juros'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-between border-t border-borda pt-3 text-sm">
          <span className="text-texto-suave">Total</span>
          <span className="text-lg font-bold text-ok">{formatarMoeda(total)}</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-marca py-2.5 text-sm font-semibold text-sobre-marca transition hover:bg-marca-escura disabled:opacity-60"
        >
          {isSubmitting ? 'Enviando…' : 'Concluir pedido'}
        </button>

        <p className="text-center text-[11px] text-texto-fraco">
          Demonstração: nenhum pagamento é processado de verdade.
        </p>
      </form>
    </aside>
  );
}

function Sucesso({ pedido }: { pedido: PedidoLoja }) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-ok/15 text-2xl text-ok">
        ✓
      </div>
      <h1 className="text-xl font-bold">Pedido confirmado</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Número <strong className="font-mono text-texto">#{pedido.numero}</strong> ·{' '}
        {formatarMoeda(pedido.total)}
      </p>
      <p className="mx-auto mt-4 max-w-md text-xs text-texto-fraco">
        O estoque já foi reservado e o pedido apareceu no painel administrativo.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          to="/loja/conta"
          className="rounded-lg bg-marca px-4 py-2 text-sm font-medium text-sobre-marca transition hover:bg-marca-escura"
        >
          Ver meus pedidos
        </Link>
        <Link
          to="/loja"
          className="rounded-lg border border-borda px-4 py-2 text-sm transition hover:bg-realce"
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
