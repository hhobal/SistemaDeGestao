// ======================================
// SESSÃO DO USUÁRIO
// ======================================
// Guarda quem está logado e expõe entrar/sair. A expiração detectada
// pelo cliente HTTP (401) chega aqui pelo `aoExpirarSessao`, então
// qualquer requisição de qualquer tela derruba a sessão de forma
// consistente — sem cada página precisar tratar isso.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, aoExpirarSessao, gravarSessao, lerSessao, limparSessao, type Sessao } from '@/comum/api';

type Perfil = Sessao['usuario']['perfil'];

type ContextoAuth = {
  sessao: Sessao | null;
  autenticado: boolean;
  entrar: (usuario: string, senha: string) => Promise<void>;
  sair: () => void;
  /** Visitante tem acesso somente leitura — regra também aplicada na API. */
  podeEscrever: boolean;
  temPerfil: (...perfis: Perfil[]) => boolean;
};

const Contexto = createContext<ContextoAuth | null>(null);

export function ProvedorAuth({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => lerSessao());

  useEffect(() => {
    // Uma única inscrição para toda a aplicação: quando qualquer
    // requisição receber 401, o estado local acompanha o storage que o
    // cliente HTTP já limpou.
    //
    // Reage só ao escopo do painel: a sessão do cliente da loja expira
    // por conta própria e não deve deslogar o lojista.
    return aoExpirarSessao(escopo => {
      if (escopo === 'painel') setSessao(null);
    });
  }, []);

  const valor = useMemo<ContextoAuth>(() => {
    const perfil = sessao?.usuario.perfil;

    return {
      sessao,
      autenticado: sessao !== null,
      podeEscrever: perfil !== undefined && perfil !== 'Visitante',
      temPerfil: (...perfis) => (perfil ? perfis.includes(perfil) : false),

      entrar: async (usuario, senha) => {
        const nova = await api.post<Sessao>(
          '/auth/login',
          { usuario, senha },
          { semAutenticacao: true }
        );
        gravarSessao(nova);
        setSessao(nova);
      },

      sair: () => {
        limparSessao();
        setSessao(null);
      }
    };
  }, [sessao]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <ProvedorAuth>.');
  return contexto;
}
