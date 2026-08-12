// ======================================
// TEMA
// ======================================
// O tema claro da versão anterior ficava ruim porque as cores eram
// declaradas duas vezes, e as duas listas saíam de sincronia. Estes
// testes travam a estrutura que evita isso.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { temaInicial } from './TemaContext';

const CSS = fs.readFileSync(path.join(__dirname, '..', 'index.css'), 'utf8');

/** Extrai os nomes de token (--color-x) declarados num bloco. */
function tokensDe(seletor: string) {
  const bloco = CSS.split(seletor)[1]?.split('}')[0] ?? '';
  return new Set([...bloco.matchAll(/(--color-[\w-]+)\s*:/g)].map(m => m[1]));
}

describe('paridade entre os temas', () => {
  it('o tema claro redefine exatamente os mesmos tokens do escuro', () => {
    // Um token esquecido aqui é texto escuro sobre fundo escuro, ou o
    // contrário — que é como o tema claro anterior quebrava.
    const escuro = tokensDe('@theme {');
    const claro = tokensDe("[data-tema='claro'] {");

    const faltando = [...escuro].filter(t => !claro.has(t));
    const sobrando = [...claro].filter(t => !escuro.has(t));

    expect(faltando, `tokens sem versão clara: ${faltando.join(', ')}`).toEqual([]);
    expect(sobrando, `tokens só no tema claro: ${sobrando.join(', ')}`).toEqual([]);
  });

  it('nenhum token tem o mesmo valor nos dois temas', () => {
    // Se a cor não muda, o token não precisava existir — ou alguém
    // copiou o valor errado ao criar o tema claro.
    const valores = (seletor: string) => {
      const bloco = CSS.split(seletor)[1]?.split('}')[0] ?? '';
      return Object.fromEntries(
        [...bloco.matchAll(/(--color-[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()])
      );
    };

    const escuro = valores('@theme {');
    const claro = valores("[data-tema='claro'] {");

    const iguais = Object.keys(claro).filter(t => escuro[t] === claro[t]);
    expect(iguais, `cores idênticas nos dois temas: ${iguais.join(', ')}`).toEqual([]);
  });
});

// ─── CONTRASTE ─────────────────────────────
// Uma paleta pode parecer boa e ser ilegível: âmbar sobre branco tem
// contraste de 4.06:1, abaixo do mínimo, e ninguém percebe olhando.
// Estes testes medem, então mexer numa cor e piorar a legibilidade
// quebra a suíte em vez de chegar em produção.

/** Luminância relativa conforme WCAG 2.1. */
function luminancia(hex: string) {
  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

function coresDe(seletor: string) {
  const bloco = CSS.split(seletor)[1]?.split('}')[0] ?? '';
  return Object.fromEntries(
    [...bloco.matchAll(/(--color-[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]])
  ) as Record<string, string>;
}

// [frente, fundo, mínimo] — 4.5 para texto, 3 para contorno de campo,
// que o WCAG 1.4.11 trata como componente de interface e não como texto.
const PARES: [string, string, number][] = [
  ['--color-texto', '--color-fundo', 4.5],
  ['--color-texto', '--color-cartao', 4.5],
  ['--color-texto', '--color-superficie', 4.5],
  ['--color-texto-suave', '--color-fundo', 4.5],
  ['--color-texto-suave', '--color-cartao', 4.5],
  ['--color-texto-fraco', '--color-fundo', 4.5],
  // O par que justifica o token: texto claro sobre âmbar reprova, e foi
  // por isso que `sobre-marca` passou a existir em vez de `text-white`.
  ['--color-sobre-marca', '--color-marca', 4.5],
  ['--color-marca', '--color-fundo', 4.5],
  ['--color-marca', '--color-cartao', 4.5],
  ['--color-info', '--color-fundo', 4.5],
  ['--color-ok', '--color-fundo', 4.5],
  ['--color-erro', '--color-fundo', 4.5],
  ['--color-aviso', '--color-fundo', 4.5],
  ['--color-borda-clara', '--color-fundo', 3],
  ['--color-borda-clara', '--color-cartao', 3]
];

describe.each([
  ['escuro', '@theme {'],
  ['claro', "[data-tema='claro'] {"]
])('contraste no tema %s', (_nome, seletor) => {
  const cores = coresDe(seletor);

  it.each(PARES)('%s sobre %s', (frente, fundo, minimo) => {
    const razao = contraste(cores[frente], cores[fundo]);
    expect(
      Number(razao.toFixed(2)),
      `${frente} (${cores[frente]}) sobre ${fundo} (${cores[fundo]}) dá ${razao.toFixed(2)}:1, mínimo ${minimo}:1`
    ).toBeGreaterThanOrEqual(minimo);
  });
});

describe('separação entre marca e aviso', () => {
  it('a marca não pode ser confundida com o estado pendente', () => {
    // As duas são quentes. Se ficarem parecidas demais, um botão vira
    // etiqueta de status aos olhos de quem usa — foi o risco criado ao
    // adotar âmbar como marca, e o motivo de `aviso` ter virado laranja.
    for (const seletor of ['@theme {', "[data-tema='claro'] {"]) {
      const cores = coresDe(seletor);
      expect(cores['--color-marca']).not.toBe(cores['--color-aviso']);
      const distancia = Math.abs(
        luminancia(cores['--color-marca']) - luminancia(cores['--color-aviso'])
      );
      expect(distancia, `marca e aviso quase idênticas em ${seletor}`).toBeGreaterThan(0.03);
    }
  });
});

describe('temaInicial', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('respeita a escolha salva', () => {
    localStorage.setItem('gestaopro_tema', 'claro');
    expect(temaInicial()).toBe('claro');
  });

  it('ignora valor inválido no storage', () => {
    // O localStorage é editável pelo usuário; um valor estranho não pode
    // deixar a interface sem tema.
    localStorage.setItem('gestaopro_tema', 'roxo');
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(temaInicial()).toBe('escuro');
  });

  it('sem escolha salva, segue a preferência do sistema', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('light')
    }));
    expect(temaInicial()).toBe('claro');
  });

  it('cai no escuro quando o sistema não informa preferência', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(temaInicial()).toBe('escuro');
  });
});
