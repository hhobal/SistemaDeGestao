// ======================================
// NOTIFICAÇÕES
// ======================================
// Os alertas já vêm calculados em /api/dashboard: estoque crítico,
// lançamentos vencidos e O.S. urgentes. Recalcular aqui criaria uma
// segunda versão da verdade, que uma hora divergiria da primeira.

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/comum/api';

type Alertas = {
  estoqueCritico: { id: number; nome: string; estoque: number }[];
  contasVencidas: { id: number; descricao: string; valor: string | number }[];
  osUrgentes: { id: number; numero: string; titulo: string }[];
};

type RespostaDashboard = { alertas: Alertas };

export function Notificacoes() {
  const [aberto, setAberto] = useState(false);
  const painel = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<RespostaDashboard>('/dashboard'),
    // Os mesmos dados do dashboard: com a chave igual, as duas telas
    // compartilham uma requisição só.
    staleTime: 60_000
  });

  // Fecha ao clicar fora ou apertar Esc — o comportamento que qualquer
  // menu suspenso precisa ter para não ficar preso na tela.
  useEffect(() => {
    if (!aberto) return;

    const aoClicarFora = (evento: MouseEvent) => {
      if (painel.current && !painel.current.contains(evento.target as Node)) setAberto(false);
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  const alertas = data?.alertas;

  const itens = [
    {
      chave: 'estoque',
      quantidade: alertas?.estoqueCritico?.length ?? 0,
      texto: (n: number) => `${n} produto${n > 1 ? 's' : ''} abaixo do estoque mínimo`,
      para: '/estoque',
      cor: 'text-aviso'
    },
    {
      chave: 'financas',
      quantidade: alertas?.contasVencidas?.length ?? 0,
      texto: (n: number) => `${n} lançamento${n > 1 ? 's' : ''} vencido${n > 1 ? 's' : ''}`,
      para: '/financas',
      cor: 'text-erro'
    },
    {
      chave: 'os',
      quantidade: alertas?.osUrgentes?.length ?? 0,
      texto: (n: number) => `${n} O.S. urgente${n > 1 ? 's' : ''} em aberto`,
      para: '/os',
      cor: 'text-erro'
    }
  ].filter(item => item.quantidade > 0);

  const total = itens.reduce((soma, item) => soma + item.quantidade, 0);

  return (
    <div className="relative" ref={painel}>
      <button
        onClick={() => setAberto(a => !a)}
        aria-label={total > 0 ? `${total} alertas` : 'Sem alertas'}
        aria-expanded={aberto}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-borda text-texto-suave transition hover:bg-realce hover:text-texto"
      >
        <Bell aria-hidden size={18} strokeWidth={1.75} />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-erro px-1 text-[10px] font-bold text-white">
            {total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-borda bg-cartao shadow-xl">
          <div className="border-b border-borda px-4 py-2 text-xs font-semibold text-texto-suave">
            Alertas
          </div>

          {itens.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-texto-fraco">
              Nada precisando de atenção agora.
            </p>
          ) : (
            <ul>
              {itens.map(item => (
                <li key={item.chave}>
                  <Link
                    to={item.para}
                    onClick={() => setAberto(false)}
                    className="flex items-center justify-between gap-2 px-4 py-3 text-sm transition hover:bg-realce"
                  >
                    <span className={item.cor}>{item.texto(item.quantidade)}</span>
                    <span className="text-texto-fraco">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
