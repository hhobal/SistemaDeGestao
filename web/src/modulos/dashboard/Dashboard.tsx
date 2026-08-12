import { useQuery } from '@tanstack/react-query';
import { api } from '@/comum/api';

// O formato espelha o retorno de GET /api/dashboard
// (backend/src/controllers/dashboard.controller.js).
// Valores monetários chegam como string: o Prisma serializa Decimal
// assim para não perder precisão no JSON.
type Dashboard = {
  cards: {
    clientesAtivos: number;
    osAbertas: number;
    pedidosPendentes: number;
    faturamentoTotal: string | number;
    estoqueCritico: number;
    contasVencidas: number;
  };
  faturamentoMensal: { mes: string; total: string | number }[];
  topClientes: { id: number; nome: string; total: string | number; compras: number }[];
};

const moeda = (valor: string | number) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function Dashboard() {
  const { data, isPending, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Dashboard>('/dashboard')
  });

  if (isPending) return <Esqueleto />;

  if (error) {
    return (
      <div className="rounded-lg border border-erro/40 bg-erro/10 p-4 text-sm text-erro">
        {error.message}
      </div>
    );
  }

  const cards = [
    { rotulo: 'Clientes ativos', valor: data.cards.clientesAtivos },
    { rotulo: 'O.S. em aberto', valor: data.cards.osAbertas },
    { rotulo: 'Pedidos pendentes', valor: data.cards.pedidosPendentes },
    { rotulo: 'Receitas recebidas', valor: moeda(data.cards.faturamentoTotal) }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-texto-suave">Visão geral do sistema</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.rotulo} className="rounded-xl border border-borda bg-cartao p-4">
            <div className="text-xs text-texto-suave">{card.rotulo}</div>
            <div className="mt-2 text-2xl font-bold">{card.valor}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-borda bg-cartao p-4">
        <h2 className="mb-4 text-sm font-semibold text-texto-suave">Faturamento mensal</h2>
        <BarrasSimples
          itens={data.faturamentoMensal.map(m => ({ rotulo: m.mes, valor: Number(m.total) }))}
        />
      </div>

      <div className="rounded-xl border border-borda bg-cartao p-4">
        <h2 className="mb-4 text-sm font-semibold text-texto-suave">Top 5 clientes</h2>
        <ul className="space-y-2">
          {data.topClientes.map(cliente => (
            <li key={cliente.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{cliente.nome}</span>
              <span className="shrink-0 font-semibold text-ok">{moeda(cliente.total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Gráfico em CSS puro por enquanto — uma biblioteca entra quando houver
// necessidade real de eixo, tooltip e escala. Serve para validar que os
// dados chegam certos sem adicionar dependência cedo demais.
function BarrasSimples({ itens }: { itens: { rotulo: string; valor: number }[] }) {
  if (itens.length === 0) {
    return <p className="text-sm text-texto-fraco">Sem dados no período.</p>;
  }
  const maximo = Math.max(...itens.map(i => i.valor), 1);

  return (
    <div className="flex h-48 items-end gap-2">
      {itens.map(item => (
        <div key={item.rotulo} className="flex flex-1 flex-col items-center gap-2">
          <div className="text-[10px] text-texto-fraco">{moeda(item.valor)}</div>
          <div
            className="w-full rounded-t bg-marca/70"
            style={{ height: `${Math.max(2, (item.valor / maximo) * 100)}%` }}
            title={`${item.rotulo}: ${moeda(item.valor)}`}
          />
          <div className="text-[10px] text-texto-suave">{item.rotulo}</div>
        </div>
      ))}
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-48 animate-pulse rounded bg-cartao" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-cartao" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-cartao" />
    </div>
  );
}
