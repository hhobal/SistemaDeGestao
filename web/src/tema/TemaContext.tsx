// ======================================
// TEMA CLARO / ESCURO
// ======================================
// A versão anterior tinha um tema claro que ficava ruim porque as cores
// eram declaradas duas vezes, e as duas listas saíam do lugar. Aqui há
// uma lista só de nomes (--color-fundo, --color-texto...) e cada tema
// atribui outros valores aos mesmos nomes — nenhum componente sabe qual
// tema está ativo.
//
// A escolha é aplicada como atributo no <html>, e não por classe no
// <body>: assim o CSS pode reagir antes de o React montar, evitando o
// piscar de tela clara em quem escolheu escuro.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Tema = 'claro' | 'escuro';

const CHAVE = 'gestaopro_tema';

/** Lê a preferência salva; se não houver, segue a do sistema. */
export function temaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE);
  if (salvo === 'claro' || salvo === 'escuro') return salvo;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro';
}

type ContextoTema = {
  tema: Tema;
  alternar: () => void;
};

const Contexto = createContext<ContextoTema | null>(null);

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem(CHAVE, tema);
    // Faz o navegador desenhar barra de rolagem e campos nativos na
    // variação certa; sem isto eles ficam escuros no tema claro.
    document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : 'dark';
  }, [tema]);

  return (
    <Contexto.Provider
      value={{ tema, alternar: () => setTema(t => (t === 'claro' ? 'escuro' : 'claro')) }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useTema() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useTema precisa estar dentro de <ProvedorTema>.');
  return contexto;
}
