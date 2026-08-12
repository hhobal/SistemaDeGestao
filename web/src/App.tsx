import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProvedorAuth } from './auth/AuthContext';
import { RotaProtegida } from './auth/RotaProtegida';
import { Shell } from './layout/Shell';
import { Login } from './paginas/Login';
import { Dashboard } from './paginas/Dashboard';
import { Clientes } from './paginas/Clientes';
import { Produtos } from './paginas/Produtos';
import { Pedidos } from './paginas/Pedidos';
import { OrdensServico } from './paginas/OrdensServico';
import { Financas } from './paginas/Financas';
import { Estoque } from './paginas/Estoque';
import { Usuarios } from './paginas/Usuarios';
import { ProvedorCarrinho } from './loja/CarrinhoContext';
import { LayoutLoja } from './loja/LayoutLoja';
import { Catalogo } from './paginas/loja/Catalogo';
import { Carrinho } from './paginas/loja/Carrinho';
import { Conta } from './paginas/loja/Conta';
import { ErroApi } from './lib/api';

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

            <Route element={<RotaProtegida />}>
              <Route element={<Shell />}>
                <Route index element={<Dashboard />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="produtos" element={<Produtos />} />
                <Route path="pedidos" element={<Pedidos />} />
                <Route path="os" element={<OrdensServico />} />
                <Route path="financas" element={<Financas />} />
                <Route path="estoque" element={<Estoque />} />
                <Route path="usuarios" element={<Usuarios />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProvedorAuth>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// O placeholder "EmBreve" foi removido: todas as rotas listadas no menu
// já apontam para telas reais. As seções ainda não migradas (estoque,
// agenda, tarefas, notas, usuários, fornecedores e relatórios) entram
// no menu conforme forem sendo implementadas — oferecer um link que só
// avisa "ainda não pronto" seria pior que não oferecer o link.
