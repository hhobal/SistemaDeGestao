import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatarMoeda, paraNumero, type Dinheiro } from '../lib/tipos';

// Os cinco endpoints de /relatorios devolvem números já agregados pelo
// servidor. A tela só apresenta — nenhuma soma acontece aqui, para não
// existir uma segunda versão da verdade.
type PontoMensal = { mes: string; total: Dinheiro };
type TopCliente = { id: number; nome: string; total: Dinheiro; compras: number };
type StatusOS = Record<string, number>;
type ProdutoCritico = { id: number; nome: string; estoque: number; estoqueMin: number };
type MaisVendido = { id: number; nome: string; quantidade: number; total: Dinheiro };

const ROTULO_MES = (mes: string) => {
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`;
};

export function Relatorios() {
  const mensal = useQuery({
    queryKey: ['relatorios', 'faturamento-mensal'],
    queryFn: () => api.get<PontoMensal[]>('/relatorios/faturamento-mensal')
  });
  const clientes = useQuery({
    queryKey: ['relatorios', 'top-clientes'],
    queryFn: () => api.get<TopCliente[]>('/relatorios/top-clientes')
  });
  const statusOS = useQuery({
    queryKey: ['relatorios', 'status-os'],
    queryFn: () => api.get<StatusOS>('/relatorios/status-os')
  });
  const criticos = useQuery({
    queryKey: ['relatorios', 'estoque-critico'],
    queryFn: () => api.get<ProdutoCritico[]>('/relatorios/estoque-critico')
  });
  const vendidos = useQuery({
    queryKey: ['relatorios', 'produtos-mais-vendidos'],
    queryFn: () => api.get<MaisVendido[]>('/relatorios/produtos-mais-vendidos')
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Relatórios</h1>
        <p className="text-sm text-texto-suave">
          Números agregados pela API, somando vendas da loja e ordens de serviço.
        </p>
      </div>

      <Painel titulo="Faturamento dos últimos 12 meses" carregando={mensal.isPending}>
        {mensal.data && <Barras itens={mensal.data} />}
      </Painel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Clientes que mais compraram" carregando={clientes.isPending}>
          <Ranking
            itens={(clientes.data ?? []).map(c => ({
              chave: c.id,
              rotulo: c.nome,
              detalhe: `${c.compras} ${c.compras === 1 ? 'compra' : 'compras'}`,
              valor: formatarMoeda(c.total),
              proporcao: paraNumero(c.total)
            }))}
            vazio="Nenhuma compra registrada ainda."
          />
        </Painel>

        <Painel titulo="Produtos mais vendidos" carregando={vendidos.isPending}>
          <Ranking
            itens={(vendidos.data ?? []).map(p => ({
              chave: p.id,
              rotulo: p.nome,
              detalhe: `${p.quantidade} unidades`,
              valor: formatarMoeda(p.total),
              proporcao: p.quantidade
            }))}
            vazio="Nenhum produto vendido ainda."
          />
        </Painel>

        <Painel titulo="Ordens de serviço por situação" carregando={statusOS.isPending}>
          {statusOS.data && <Distribuicao dados={statusOS.data} />}
        </Painel>

        <Painel titulo="Produtos abaixo do estoque mínimo" carregando={criticos.isPending}>
          {criticos.data?.length === 0 ? (
            <p className="py-6 text-center text-sm text-ok">Nenhum produto precisando de reposição.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {criticos.data?.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{p.nome}</span>
                  <span className={`shrink-0 ${p.estoque === 0 ? 'text-erro' : 'text-aviso'}`}>
                    {p.estoque} <span className="text-texto-fraco">/ mín. {p.estoqueMin}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>
    </div>
  );
}

function Painel({
  titulo,
  carregando,
  children
}: {
  titulo: string;
  carregando: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-borda bg-cartao p-4">
      <h2 className="mb-4 text-sm font-semibold text-texto-suave">{titulo}</h2>
      {carregando ? <div className="h-40 animate-pulse rounded bg-realce" /> : children}
    </section>
  );
}

function Barras({ itens }: { itens: PontoMensal[] }) {
  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-texto-fraco">Sem dados no período.</p>;
  }
  const maximo = Math.max(...itens.map(i => paraNumero(i.total)), 1);

  return (
    <div className="flex h-52 items-end gap-1 overflow-x-auto">
      {itens.map(item => {
        const valor = paraNumero(item.total);
        return (
          <div key={item.mes} className="flex min-w-12 flex-1 flex-col items-center gap-1">
            <span className="text-[9px] text-texto-fraco">
              {(valor / 1000).toFixed(0)}k
            </span>
            <div
              className="w-full rounded-t bg-marca/70 transition-all"
              style={{ height: `${Math.max(2, (valor / maximo) * 100)}%` }}
              title={`${ROTULO_MES(item.mes)}: ${formatarMoeda(item.total)}`}
            />
            <span className="text-[10px] text-texto-suave">{ROTULO_MES(item.mes)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Ranking({
  itens,
  vazio
}: {
  itens: { chave: number; rotulo: string; detalhe: string; valor: string; proporcao: number }[];
  vazio: string;
}) {
  if (itens.length === 0) {
    return <p className="py-6 text-center text-sm text-texto-fraco">{vazio}</p>;
  }
  const maximo = Math.max(...itens.map(i => i.proporcao), 1);

  return (
    <ol className="space-y-3">
      {itens.map((item, i) => (
        <li key={item.chave}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-texto-fraco">{i + 1}.</span>
              {item.rotulo}
            </span>
            <span className="shrink-0 font-semibold text-ok">{item.valor}</span>
          </div>
          {/* A barra dá a proporção de relance; o número exato fica ao
              lado para quem precisa do valor. */}
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-realce">
            <div
              className="h-full rounded-full bg-marca/70"
              style={{ width: `${(item.proporcao / maximo) * 100}%` }}
            />
          </div>
          <div className="mt-0.5 text-[10px] text-texto-fraco">{item.detalhe}</div>
        </li>
      ))}
    </ol>
  );
}

const CORES_STATUS_OS: Record<string, string> = {
  aberta: 'bg-aviso',
  andamento: 'bg-marca',
  concluida: 'bg-ok',
  cancelada: 'bg-erro'
};

function Distribuicao({ dados }: { dados: StatusOS }) {
  const entradas = Object.entries(dados);
  const total = entradas.reduce((soma, [, quantidade]) => soma + quantidade, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-texto-fraco">Nenhuma O.S. registrada.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full">
        {entradas.map(([status, quantidade]) => (
          <div
            key={status}
            className={CORES_STATUS_OS[status] ?? 'bg-realce'}
            style={{ width: `${(quantidade / total) * 100}%` }}
            title={`${status}: ${quantidade}`}
          />
        ))}
      </div>
      <ul className="space-y-1 text-sm">
        {entradas.map(([status, quantidade]) => (
          <li key={status} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${CORES_STATUS_OS[status] ?? 'bg-realce'}`} />
              <span className="capitalize">{status}</span>
            </span>
            <span className="text-texto-suave">
              {quantidade}{' '}
              <span className="text-texto-fraco">({((quantidade / total) * 100).toFixed(0)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
