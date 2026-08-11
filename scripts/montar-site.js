// ======================================
// MONTAGEM DO SITE PARA PUBLICAÇÃO
// ======================================
// Junta as duas interfaces numa única pasta, para caberem em um só
// projeto da Vercel:
//
//   /          → web/dist       (React, em migração)
//   /legado/   → frontend/      (versão anterior, completa)
//
// Enquanto a migração não termina, a versão anterior é a única que tem
// todas as telas — e a única com a loja virtual, que é a parte visível
// sem login. Descartá-la agora encolheria a demonstração.
//
// A versão anterior funciona sob um subcaminho sem alteração nenhuma
// porque todos os seus links são relativos: `href="loja.html"` e
// `src="js/api.js"` resolvem sozinhos a partir de /legado/.
//
// Roda no build da Vercel (Linux) e também no Windows: usa só a API de
// arquivos do Node, sem comando de shell.

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'site');
const REACT = path.join(RAIZ, 'web', 'dist');
const LEGADO = path.join(RAIZ, 'frontend');

// Pastas que existem no repositório mas não pertencem ao site
// publicado. Sem esta lista, os testes do front-end antigo iriam junto.
const NAO_PUBLICAR = new Set(['tests', 'node_modules']);

function copiarPasta(origem, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const item of fs.readdirSync(origem, { withFileTypes: true })) {
    if (NAO_PUBLICAR.has(item.name)) continue;
    const de = path.join(origem, item.name);
    const para = path.join(destino, item.name);
    if (item.isDirectory()) copiarPasta(de, para);
    else fs.copyFileSync(de, para);
  }
}

function contar(pasta) {
  let total = 0;
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    total += item.isDirectory() ? contar(path.join(pasta, item.name)) : 1;
  }
  return total;
}

function main() {
  if (!fs.existsSync(REACT)) {
    // Falhar aqui é melhor que publicar um site pela metade: sem esta
    // checagem, a Vercel subiria só a versão antiga e ninguém notaria
    // que o build do React não rodou.
    console.error('web/dist não existe. Rode o build do React antes de montar o site.');
    process.exit(1);
  }

  fs.rmSync(DESTINO, { recursive: true, force: true });

  copiarPasta(REACT, DESTINO);
  console.log(`React   → /          (${contar(REACT)} arquivos)`);

  copiarPasta(LEGADO, path.join(DESTINO, 'legado'));
  console.log(`Anterior → /legado/   (${contar(LEGADO)} arquivos)`);

  console.log(`\nSite montado em ${path.relative(RAIZ, DESTINO)}/ com ${contar(DESTINO)} arquivos.`);
}

main();
