// ======================================
// MARCA
// ======================================
// Nome e imagens do produto ficam só aqui. Antes o ícone e o texto
// estavam repetidos em quatro telas, então trocar a identidade
// significava caçar as ocorrências uma a uma.
//
// DUAS VERSÕES DE CADA IMAGEM
//
// O logo é branco com laranja. Sobre o tema claro o branco sumiria no
// fundo, então existe uma variação com as letras escuras — gerada a
// partir do mesmo arquivo, invertendo só os pixels sem cor, para o
// laranja continuar idêntico nas duas.
//
// A troca é feita em JavaScript, e não por CSS, porque `<img>` não
// aceita duas fontes escolhidas por seletor sem baixar as duas.

import { useTema } from '@/tema/TemaContext';
import logoEscuro from '@/assets/logo-gestiq.png';
import logoClaro from '@/assets/logo-gestiq-claro.png';
import simboloEscuro from '@/assets/simbolo-gestiq.png';
import simboloClaro from '@/assets/simbolo-gestiq-claro.png';

export const NOME_PRODUTO = 'GESTIQ';
export const DESCRICAO_PRODUTO = 'Sistema Integrado de Gestão';

type PropsSimbolo = {
  className?: string;
  /** Some com o brilho pulsante — para onde a marca não é o assunto. */
  estatico?: boolean;
};

/**
 * Só o símbolo: o arco com as barras. Usado onde não cabe o nome —
 * barra lateral do painel e cabeçalho da loja.
 */
export function Simbolo({ className = 'h-9 w-9', estatico = false }: PropsSimbolo) {
  const { tema } = useTema();
  return (
    <img
      src={tema === 'claro' ? simboloClaro : simboloEscuro}
      alt=""
      aria-hidden
      // `motion-safe` respeita quem pediu menos animação no sistema: a
      // marca fica parada em vez de pulsar sem parar na lateral.
      className={`${className} select-none object-contain ${
        estatico ? '' : 'motion-safe:animate-pulsar-marca'
      }`}
    />
  );
}

type PropsLogo = {
  className?: string;
  /** Largura máxima do logo; o resto acompanha pela proporção. */
  largura?: string;
};

/**
 * O logo completo, com o nome e a assinatura. Usado onde a marca é o
 * assunto da tela — hoje, só o login.
 */
export function Logo({ className = '', largura = 'max-w-[260px]' }: PropsLogo) {
  const { tema } = useTema();
  return (
    // Duas animações em dois elementos de propósito: `animation` é uma
    // propriedade só, e duas classes `animate-*` no mesmo elemento se
    // sobrescreveriam. O contêiner faz a entrada, que acontece uma vez;
    // a imagem faz o brilho, que continua.
    <span className={`${largura} block w-full motion-safe:animate-entrada ${className}`}>
      <img
        src={tema === 'claro' ? logoClaro : logoEscuro}
        alt={`${NOME_PRODUTO} — ${DESCRICAO_PRODUTO}`}
        className="w-full select-none object-contain motion-safe:animate-pulsar-marca"
      />
    </span>
  );
}
