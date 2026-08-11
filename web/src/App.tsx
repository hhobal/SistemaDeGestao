import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProvedorAuth } from './auth/AuthContext';
import { RotaProtegida } from './auth/RotaProtegida';
import { Shell } from './layout/Shell';
import { Login } from './paginas/Login';
import { Dashboard } from './paginas/Dashboard';
import { Clientes } from './paginas/Clientes';
import { Produtos } from './paginas/Produtos';
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

            <Route element={<RotaProtegida />}>
              <Route element={<Shell />}>
                <Route index element={<Dashboard />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="produtos" element={<Produtos />} />
                <Route path="pedidos" element={<EmBreve titulo="Pedidos" />} />
                <Route path="os" element={<EmBreve titulo="Ordens de Serviço" />} />
                <Route path="financas" element={<EmBreve titulo="Finanças" />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProvedorAuth>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Placeholder honesto: a rota existe e o menu funciona, mas a tela
// ainda não foi migrada. Some conforme cada CRUD é implementado.
function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div>
      <h1 className="text-lg font-semibold">{titulo}</h1>
      <p className="mt-2 text-sm text-texto-suave">
        Tela ainda não migrada. Disponível na versão anterior da interface.
      </p>
    </div>
  );
}
