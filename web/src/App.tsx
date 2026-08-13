import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProvedorAuth } from '@/auth/AuthContext';
import { ProvedorTema } from '@/tema/TemaContext';
import { RotaProtegida } from '@/auth/RotaProtegida';
import { Shell } from '@/layout/Shell';
import { Login } from '@/auth/Login';
import { ProvedorCarrinho } from '@/loja/CarrinhoContext';
import { LayoutLoja } from '@/loja/LayoutLoja';
import { ErroApi } from '@/comum/api';

// ─── DIVISÃO DO PACOTE ─────────────────────
// Só o login é baixado no primeiro acesso. As dezesseis telas vinham
// juntas nele, e ninguém usa as duas áreas ao mesmo tempo: quem entra
// no painel nunca precisa do carrinho, e quem visita a loja nunca vê
// os relatórios.
//
// Fica de fora do adiamento o que forma a casca — Shell, LayoutLoja e
// os provedores. São pequenos, e adiá-los faria a estrutura da página
// aparecer depois do conteúdo, que é pior do que esperar por ela.
//
// O `default:` existe porque estes módulos exportam pelo nome e o
// `lazy()` espera um módulo com exportação padrão. Escrito assim, e não
// por um ajudante genérico, para o TypeScript continuar sabendo o tipo
// de cada tela — com o ajudante, todas viravam `unknown`.
const Dashboard = lazy(async () => ({
  default: (await import('@/modulos/dashboard/Dashboard')).Dashboard
}));
const Clientes = lazy(async () => ({
  default: (await import('@/modulos/clientes/Clientes')).Clientes
}));
const Produtos = lazy(async () => ({
  default: (await import('@/modulos/produtos/Produtos')).Produtos
}));
const Pedidos = lazy(async () => ({
  default: (await import('@/modulos/pedidos/Pedidos')).Pedidos
}));
const OrdensServico = lazy(async () => ({
  default: (await import('@/modulos/os/OrdensServico')).OrdensServico
}));
const Financas = lazy(async () => ({
  default: (await import('@/modulos/financas/Financas')).Financas
}));
const Estoque = lazy(async () => ({
  default: (await import('@/modulos/estoque/Estoque')).Estoque
}));
const Usuarios = lazy(async () => ({
  default: (await import('@/modulos/usuarios/Usuarios')).Usuarios
}));
const Fornecedores = lazy(async () => ({
  default: (await import('@/modulos/fornecedores/Fornecedores')).Fornecedores
}));
const Agenda = lazy(async () => ({
  default: (await import('@/modulos/agenda/Agenda')).Agenda
}));
const Tarefas = lazy(async () => ({
  default: (await import('@/modulos/tarefas/Tarefas')).Tarefas
}));
const Notas = lazy(async () => ({ default: (await import('@/modulos/notas/Notas')).Notas }));
const Relatorios = lazy(async () => ({
  default: (await import('@/modulos/relatorios/Relatorios')).Relatorios
}));

const Catalogo = lazy(async () => ({ default: (await import('@/loja/Catalogo')).Catalogo }));
const Carrinho = lazy(async () => ({ default: (await import('@/loja/Carrinho')).Carrinho }));
const Conta = lazy(async () => ({ default: (await import('@/loja/Conta')).Conta }));

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      // Repetir uma requisição que voltou 401/403 é inútil: a sessão
      // não vai se consertar sozinha, e cada tentativa atrasa o
      // redirecionamento para o login.
      retry: (tentativas, erro) => {
        if (erro instanceof ErroApi && erro.ehAutenticacao) return false;
        return tentativas < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={clienteQuery}>
      <BrowserRouter>
        <ProvedorTema>
          <ProvedorAuth>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* A loja é pública: não fica sob RotaProtegida. Quem chega
                  vê o catálogo sem criar conta; só o checkout exige login,
                  e com credencial de cliente, não de lojista. */}
              <Route
                path="/loja"
                element={
                  <ProvedorCarrinho>
                    <LayoutLoja />
                  </ProvedorCarrinho>
                }
              >
                <Route index element={<Catalogo />} />
                <Route path="carrinho" element={<Carrinho />} />
                <Route path="conta" element={<Conta />} />
              </Route>

              {/* Uma tela por módulo, cada uma vinda da sua própria pasta
                  em modulos/. Toda rota do painel passa por RotaProtegida
                  e pelo Shell, então não existe caminho que escape da
                  verificação de sessão. */}
              <Route element={<RotaProtegida />}>
                <Route element={<Shell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="produtos" element={<Produtos />} />
                  <Route path="pedidos" element={<Pedidos />} />
                  <Route path="os" element={<OrdensServico />} />
                  <Route path="financas" element={<Financas />} />
                  <Route path="estoque" element={<Estoque />} />
                  <Route path="fornecedores" element={<Fornecedores />} />
                  <Route path="agenda" element={<Agenda />} />
                  <Route path="tarefas" element={<Tarefas />} />
                  <Route path="notas" element={<Notas />} />
                  <Route path="relatorios" element={<Relatorios />} />
                  <Route path="usuarios" element={<Usuarios />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProvedorAuth>
        </ProvedorTema>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
