import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProvedorAuth } from '@/auth/AuthContext';
import { ProvedorTema } from '@/tema/TemaContext';
import { RotaProtegida } from '@/auth/RotaProtegida';
import { Shell } from '@/layout/Shell';
import { Login } from '@/auth/Login';
import { Dashboard } from '@/modulos/dashboard/Dashboard';
import { Clientes } from '@/modulos/clientes/Clientes';
import { Produtos } from '@/modulos/produtos/Produtos';
import { Pedidos } from '@/modulos/pedidos/Pedidos';
import { OrdensServico } from '@/modulos/os/OrdensServico';
import { Financas } from '@/modulos/financas/Financas';
import { Estoque } from '@/modulos/estoque/Estoque';
import { Usuarios } from '@/modulos/usuarios/Usuarios';
import { Fornecedores } from '@/modulos/fornecedores/Fornecedores';
import { Agenda } from '@/modulos/agenda/Agenda';
import { Tarefas } from '@/modulos/tarefas/Tarefas';
import { Notas } from '@/modulos/notas/Notas';
import { Relatorios } from '@/modulos/relatorios/Relatorios';
import { ProvedorCarrinho } from '@/loja/CarrinhoContext';
import { LayoutLoja } from '@/loja/LayoutLoja';
import { Catalogo } from '@/loja/Catalogo';
import { Carrinho } from '@/loja/Carrinho';
import { Conta } from '@/loja/Conta';
import { ErroApi } from '@/comum/api';

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
