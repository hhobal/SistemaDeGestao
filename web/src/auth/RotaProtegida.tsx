// ======================================
// GUARDA DE ROTA
// ======================================
// No front antigo cada página repetia o próprio "se não tem sessão,
// redireciona". Aqui a regra existe uma vez e envolve todas as rotas
// privadas de uma vez só.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RotaProtegida() {
  const { autenticado } = useAuth();
  const local = useLocation();

  if (!autenticado) {
    // `state` guarda onde a pessoa queria chegar: depois do login ela
    // volta para lá em vez de cair sempre no dashboard.
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  return <Outlet />;
}
