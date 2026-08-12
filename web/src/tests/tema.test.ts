// ======================================
// TEMA
// ======================================
// O tema claro da versão anterior ficava ruim porque as cores eram
// declaradas duas vezes, e as duas listas saíam de sincronia. Estes
// testes travam a estrutura que evita isso.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { temaInicial } from '../tema/TemaContext';

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
