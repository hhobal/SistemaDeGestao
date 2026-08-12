import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Caminho absoluto de propósito: o projeto vive em uma pasta com espaço
// e acento no nome ("Sistema de Gestão"), e o root relativo era
// resolvido a partir do diretório errado.
const AQUI = path.dirname(fileURLToPath(import.meta.url));

// Os testes do front-end vivem em web/ e rodam pelo Vitest de lá, com
// jsdom e as ferramentas do React. Aqui ficam apenas os do servidor,
// que precisam de Node e de um PostgreSQL de verdade.
export default defineConfig({
  test: {
    name: 'backend',
    root: AQUI,
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
    setupFiles: [path.join(AQUI, 'tests', 'setup.js')],
    globalSetup: [path.join(AQUI, 'tests', 'global-setup.js')],

    // Os arquivos compartilham o mesmo banco e cada um limpa as tabelas
    // no beforeEach; em paralelo, um apagaria os dados do outro.
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 20000,
    hookTimeout: 30000,

    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: ['src/server.js']
    }
  }
});
