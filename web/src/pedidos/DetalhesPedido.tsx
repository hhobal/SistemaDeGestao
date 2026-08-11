import { useQuery } from '@tanstack/react-query';
import { Modal } from '../componentes/Modal';
import { Botao } from '../componentes/Botao';
import { formatarData, formatarMoeda, paraNumero } from '../lib/tipos';
import {
  chavesPedido,
  obterPedido,
  ROTULO_PAGAMENTO,
  ROTULO_STATUS,
  type Pedido
} from './api';
import { EtiquetaStatus } from './EtiquetaStatus';

type Props = {
  pedido: Pedido | null;
  aoFechar: () => void;
};

export function DetalhesPedido({ pedido, aoFechar }: Props) {
  // Só busca o detalhe quando há um pedido escolhido: custo e lucro não
  // vêm na listagem, então é uma requisição a mais por abertura.
  const { data, isPending, error } = useQuery({
    queryKey: chavesPedido.detalhe(pedido?.id ?? 0),
    queryFn: () => obterPedido(pedido!.id),
    enabled: pedido !== null
  });

  return (
    <Modal
      aberto={pedido !== null}
      titulo={pedido ? `Pedido #${pedido.numero}` : 'Pedido'}
      aoFechar={aoFechar}
      rodape={
        <Botao variante="secundario" onClick={aoFechar}>
          Fechar
        </Botao>
      }
    >
      {isPending && pedido && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-realce" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-erro">{error.message}</p>}

      {data && (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Info rotulo="Data">{formatarData(data.data)}</Info>
            <Info rotulo="Situação">
              <EtiquetaStatus status={data.status} />
            </Info>
            <Info rotulo="Pagamento">
              {ROTULO_PAGAMENTO[data.pagamento] ?? data.pagamento}
              {data.parcelas > 1 && (
                <span className="text-texto-fraco"> · {data.parcelas}× sem juros</span>
              )}
            </Info>
            <Info rotulo="Cliente">{data.cliente?.nome ?? '—'}</Info>
          </div>

          {data.enderecoEntrega && (
            <Info rotulo="Entrega">
              <span className="text-texto-suave">{data.enderecoEntrega}</span>
            </Info>
          )}

          <div>
            <div className="mb-2 text-xs text-texto-suave">
              Itens ({data.itens.length})
            </div>
            <ul className="divide-y divide-borda rounded-lg border border-borda">
              {data.itens.map(item => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    {/* nome e preço são cópias do momento da compra: se o
                        produto mudar depois, o pedido antigo não muda. */}
                    <div className="truncate">{item.nome}</div>
                    <div className="text-xs text-texto-fraco">
                      {item.quantidade} × {formatarMoeda(item.precoUnitario)}
                    </div>
                  </div>
                  <div className="shrink-0 font-medium">{formatarMoeda(item.subtotal)}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1 rounded-lg bg-superficie p-3">
            <Linha rotulo="Total do pedido" valor={formatarMoeda(data.total)} />
            <Linha
              rotulo="Custo da mercadoria"
              valor={`− ${formatarMoeda(data.custoTotal)}`}
              cor="text-erro"
            />
            <div className="mt-2 border-t border-borda pt-2">
              <Linha
                rotulo="Lucro bruto"
                valor={formatarMoeda(data.lucroBruto)}
                cor={paraNumero(data.lucroBruto) >= 0 ? 'text-ok' : 'text-erro'}
                destaque
              />
            </div>
          </div>

          {data.status === 'cancelado' && (
            <p className="rounded-lg border border-borda bg-superficie p-3 text-xs text-texto-suave">
              Pedido cancelado: o estoque foi devolvido ao catálogo e os lançamentos
              financeiros correspondentes foram estornados.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Info({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-texto-fraco">{rotulo}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  cor = '',
  destaque = false
}: {
  rotulo: string;
  valor: string;
  cor?: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className={destaque ? 'font-semibold' : 'text-texto-suave'}>{rotulo}</span>
      <span className={`${cor} ${destaque ? 'font-bold' : ''}`}>{valor}</span>
    </div>
  );
}

export { ROTULO_STATUS };
