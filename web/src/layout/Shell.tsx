// ======================================
// CASCA DA APLICAÇÃO
// ======================================
// Sidebar + topbar que envolvem todas as telas privadas.
// O menu do celular nasce funcionando aqui: no front antigo o botão que
// abria a sidebar ficava dentro dela, então sumia junto e a navegação
// ficava inalcançável no telefone.
//
// ─── DOIS MENUS, UM COMPONENTE ─────────────
// A lateral tem dois comportamentos que não se misturam, e é por isso
// que existem dois estados em vez de um:
//
//   `menuAberto`  — só no celular. A lateral vira gaveta sobreposta,
//                   entra por cima do conteúdo e fecha ao navegar.
//   `recolhido`   — só no computador. A lateral encolhe para a faixa
//                   de ícones e o conteúdo ganha a largura de volta.
//
// Um estado só não daria conta: recolher no celular deixaria uma tira
// de 72px cobrindo a tela, e a gaveta no computador esconderia a
// navegação sem necessidade — sobra espaço ali. Por isso o recolhimento
// é aplicado sempre com o prefixo `md:`, e a gaveta com `translate`.

import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Boxes,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Menu as MenuIcone,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  StickyNote,
  Sun,
  Truck,
  Users,
  Wallet,
  Wrench
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useTema } from '@/tema/TemaContext';
import { NOME_PRODUTO, Simbolo } from '@/comum/componentes/Marca';
import { Carregando } from '@/comum/componentes/Carregando';
import { Notificacoes } from './Notificacoes';

// `somenteAdmin` esconde o item de quem não pode usá-lo. A API já
// recusa (403); tirar do menu evita oferecer um caminho sem saída.
//
// O ícone é o componente, não um emoji: emoji é fonte do sistema, muda
// de desenho entre Windows, Mac e Android, e não aceita a cor do tema.
const MENU = [
  { rotulo: 'Dashboard', para: '/', Icone: LayoutDashboard, exato: true },
  { rotulo: 'Clientes', para: '/clientes', Icone: Users },
  { rotulo: 'Fornecedores', para: '/fornecedores', Icone: Truck },
  { rotulo: 'Produtos', para: '/produtos', Icone: Package },
  { rotulo: 'Estoque', para: '/estoque', Icone: Boxes },
  { rotulo: 'Pedidos', para: '/pedidos', Icone: ShoppingCart },
  { rotulo: 'Ordens de Serviço', para: '/os', Icone: Wrench },
  { rotulo: 'Finanças', para: '/financas', Icone: Wallet },
  { rotulo: 'Agenda', para: '/agenda', Icone: CalendarDays },
  { rotulo: 'Tarefas', para: '/tarefas', Icone: ListChecks },
  { rotulo: 'Notas', para: '/notas', Icone: StickyNote },
  { rotulo: 'Relatórios', para: '/relatorios', Icone: LineChart },
  { rotulo: 'Usuários', para: '/usuarios', Icone: KeyRound, somenteAdmin: true }
];

const CHAVE_RECOLHIDO = 'gestiq_menu_recolhido';

// Botão de ícone do topo. Sem contorno de propósito: três quadrados
// desenhados lado a lado numa barra vazia chamavam mais atenção que o
// conteúdo da página. O fundo só aparece sob o cursor.
const BOTAO_ICONE =
  'grid h-9 w-9 place-items-center rounded-lg text-texto-suave transition-colors hover:bg-realce hover:text-texto';

export function Shell() {
  const { sessao, sair, temPerfil } = useAuth();
  const { tema, alternar } = useTema();
  const [menuAberto, setMenuAberto] = useState(false);
  // A preferência é lida na inicialização do estado, e não num efeito:
  // assim a lateral já nasce na largura certa, sem o salto de abrir
  // larga e encolher no primeiro quadro.
  const [recolhido, setRecolhido] = useState(
    () => localStorage.getItem(CHAVE_RECOLHIDO) === '1'
  );

  useEffect(() => {
    localStorage.setItem(CHAVE_RECOLHIDO, recolhido ? '1' : '0');
  }, [recolhido]);

  const itensVisiveis = MENU.filter(item => !item.somenteAdmin || temPerfil('Administrador'));

  // Aplicado ao que só some no computador recolhido. No celular a
  // gaveta é sempre larga, então o rótulo continua visível lá.
  const soExpandido = recolhido ? 'md:hidden' : '';
  const centralizado = recolhido ? 'md:justify-center md:px-0' : '';

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
        className={`fixed z-50 flex h-screen w-60 flex-col border-r border-borda bg-superficie transition-[transform,width] duration-200 md:sticky md:top-0 md:translate-x-0 ${
          recolhido ? 'md:w-[4.5rem]' : ''
        } ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* A marca é símbolo + nome escrito, não só o símbolo. Sozinho
            num espaço de 240px ele lia como um ícone esquecido no canto;
            o par preenche a linha e é o mesmo bloco que aparece no
            login. Ao recolher sobra o símbolo, que é justamente a parte
            que continua legível a 72px.

            Sem borda embaixo: a linha existia, terminava no meio da
            tela e não encontrava nada do outro lado — era ela que
            recortava o canto superior esquerdo em caixas soltas. */}
        <div className={`flex h-16 shrink-0 items-center gap-2.5 px-4 ${centralizado}`}>
          <Simbolo className="h-9 w-9 shrink-0" />
          <span
            // Mesmo espaçamento do cabeçalho da loja: as duas áreas
            // mostram a marca do mesmo jeito.
            className={`whitespace-nowrap text-[15px] font-bold tracking-[0.12em] ${soExpandido}`}
          >
            {NOME_PRODUTO}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
          <ul className="space-y-0.5">
            {itensVisiveis.map(item => (
              <li key={item.para}>
                <NavLink
                  to={item.para}
                  end={item.exato}
                  // Recolhido, o rótulo vira dica do navegador: sem isso
                  // a faixa de ícones obriga a adivinhar o destino.
                  title={recolhido ? item.rotulo : undefined}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${centralizado} ${
                      isActive
                        ? 'bg-marca/15 font-medium text-marca'
                        : 'text-texto-suave hover:bg-marca/10 hover:text-marca'
                    }`
                  }
                >
                  {/* Filho como função para saber se o item está ativo
                      aqui dentro — o className só decide a pintura do
                      próprio link, e a marca da esquerda é um elemento
                      à parte. */}
                  {({ isActive }) => (
                    <>
                      {/* Encostada na borda da lateral, fora do
                          preenchimento do <nav>: com o item recolhido
                          o fundo âmbar vira um quadrado pequeno demais
                          para dizer onde você está. */}
                      <span
                        aria-hidden
                        className={`absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-marca transition-opacity ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <item.Icone aria-hidden size={17} strokeWidth={1.75} className="shrink-0" />
                      <span className={`whitespace-nowrap ${soExpandido}`}>{item.rotulo}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Quem está logado desceu para o rodapé. No topo, empilhado
            embaixo da marca e dentro da própria moldura, formava uma
            segunda caixa competindo com a primeira logo na entrada da
            tela — e é informação de consulta, não de navegação. */}
        <div className="mt-auto shrink-0 border-t border-borda p-2">
          <div className={`flex items-center gap-3 px-2 py-1.5 ${centralizado}`}>
            <div
              title={`${sessao?.usuario.nome} — ${sessao?.usuario.perfil}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca text-xs font-bold text-sobre-marca"
            >
              {iniciais}
            </div>
            <div className={`min-w-0 ${soExpandido}`}>
              <div className="truncate text-sm font-semibold">{sessao?.usuario.nome}</div>
              <div className="truncate text-xs text-texto-fraco">{sessao?.usuario.perfil}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* O topo usa a cor do conteúdo, e não a da lateral. Pintado de
            `superficie` ele virava uma faixa larga e vazia atravessando
            a tela, com três botões perdidos na ponta direita. Da cor do
            fundo ele deixa de ser uma caixa: sobra a linha de baixo, e o
            desfoque mantém o texto legível quando a página rola por trás. */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-1.5 border-b border-borda bg-fundo/85 px-4 backdrop-blur">
          <button
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            className={`${BOTAO_ICONE} md:hidden`}
          >
            <MenuIcone aria-hidden size={18} strokeWidth={1.75} />
          </button>

          {/* No computador o mesmo canto controla a largura da lateral.
              O botão fica no topo, e não dentro dela, para não mudar de
              lugar quando ela encolhe. */}
          <button
            onClick={() => setRecolhido(r => !r)}
            aria-label={recolhido ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            title={recolhido ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!recolhido}
            className={`${BOTAO_ICONE} hidden md:grid`}
          >
            {recolhido ? (
              <PanelLeftOpen aria-hidden size={18} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose aria-hidden size={18} strokeWidth={1.75} />
            )}
          </button>

          <div className="flex-1" />

          <Notificacoes />

          <button
            onClick={alternar}
            aria-label={tema === 'escuro' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
            title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
            className={BOTAO_ICONE}
          >
            {tema === 'escuro' ? (
              <Sun aria-hidden size={18} strokeWidth={1.75} />
            ) : (
              <Moon aria-hidden size={18} strokeWidth={1.75} />
            )}
          </button>

          <button
            onClick={sair}
            className="ml-1 flex items-center gap-2 rounded-lg border border-borda px-3 py-1.5 text-xs text-texto-suave transition-colors hover:border-erro/40 hover:bg-erro/10 hover:text-erro"
          >
            <LogOut aria-hidden size={15} strokeWidth={1.75} />
            Sair
          </button>
        </header>

        {/* A espera fica aqui dentro, e não em volta das rotas: a barra
            lateral e o topo já estão na tela quando o pedaço da página
            chega, então a navegação não pisca a interface inteira. */}
        <main className="flex-1 p-4 md:p-6">
          <Suspense fallback={<Carregando />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
