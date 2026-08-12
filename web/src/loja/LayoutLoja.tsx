import { Link, NavLink, Outlet } from 'react-router-dom';
import { useCarrinho } from './CarrinhoContext';
import { clienteLogado } from './api';

export function LayoutLoja() {
  const { quantidade } = useCarrinho();
  const sessao = clienteLogado();

  return (
    <div className="min-h-screen bg-fundo">
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/loja" className="flex shrink-0 items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca text-sobre-marca">⚙</span>
            <span className="hidden sm:inline">GestãoPro</span>
          </Link>

          <div className="flex-1" />

          <NavLink
            to="/loja/conta"
            className="rounded-lg px-3 py-1.5 text-sm text-texto-suave transition hover:bg-realce hover:text-texto"
          >
            {sessao ? sessao.cliente.nome.split(' ')[0] : 'Entrar'}
          </NavLink>

          <NavLink
            to="/loja/carrinho"
            className="relative rounded-lg border border-borda px-3 py-1.5 text-sm transition hover:bg-realce"
            aria-label={`Carrinho com ${quantidade} item(ns)`}
          >
            Carrinho
            {quantidade > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-marca px-1 text-[11px] font-bold text-sobre-marca">
                {quantidade}
              </span>
            )}
          </NavLink>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-texto-fraco">
        Loja de demonstração ·{' '}
        <Link to="/" className="underline hover:text-texto-suave">
          acessar o painel administrativo
        </Link>
      </footer>
    </div>
  );
}
