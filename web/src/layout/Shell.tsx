// ======================================
// CASCA DA APLICAÇÃO
// ======================================
// Sidebar + topbar que envolvem todas as telas privadas.
// O menu do celular nasce funcionando aqui: no front antigo o botão que
// abria a sidebar ficava dentro dela, então sumia junto e a navegação
// ficava inalcançável no telefone.

import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const MENU = [
  { rotulo: 'Dashboard', para: '/', icone: '📊', exato: true },
  { rotulo: 'Clientes', para: '/clientes', icone: '👥' },
  { rotulo: 'Produtos', para: '/produtos', icone: '📦' },
  { rotulo: 'Pedidos', para: '/pedidos', icone: '🛒' },
  { rotulo: 'Ordens de Serviço', para: '/os', icone: '🔧' },
  { rotulo: 'Finanças', para: '/financas', icone: '💰' }
];

export function Shell() {
  const { sessao, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  const iniciais = (sessao?.usuario.nome ?? '?')
    .split(' ')
    .map(parte => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Escurece o conteúdo e fecha o menu ao tocar fora (só no celular) */}
      {menuAberto && (
        <button
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-40 bg-black/55 md:hidden"
        />
      )}

      <aside
        className={`fixed z-50 flex h-screen w-60 flex-col border-r border-borda bg-superficie transition-transform md:sticky md:top-0 md:translate-x-0 ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-borda px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-marca text-white">⚙</div>
          <span className="font-bold">GestãoPro</span>
        </div>

        <div className="flex items-center gap-3 border-b border-borda px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-marca text-xs font-bold text-white">
            {iniciais}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{sessao?.usuario.nome}</div>
            <div className="text-xs text-texto-fraco">{sessao?.usuario.perfil}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {MENU.map(item => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.exato}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-marca/15 text-marca'
                    : 'text-texto-suave hover:bg-realce hover:text-texto'
                }`
              }
            >
              <span aria-hidden>{item.icone}</span>
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borda bg-superficie px-4">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            className="grid h-9 w-9 place-items-center rounded-lg border border-borda md:hidden"
          >
            ☰
          </button>

          <div className="flex-1" />

          <button
            onClick={sair}
            className="rounded-lg border border-borda px-3 py-1.5 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
