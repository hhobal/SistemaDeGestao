import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Caminhos absolutos de propósito: o projeto vive em uma pasta com
// espaço e acento no nome ("Sistema de Gestão"), e o root relativo era
// resolvido a partir do diretório errado.
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_BACKEND = AQUI;
const RAIZ_FRONTEND = path.join(AQUI, '..', 'frontend');

// Dois conjuntos de teste com necessidades opostas:
//
//   backend  — precisa de Node e de um PostgreSQL de verdade.
//   frontend — precisa de um DOM (jsdom) e de nenhum banco.
//
// `projects` mantém os dois sob o mesmo `npm test` sem que um arraste a
// configuração do outro: o front-end não tenta subir banco e o back-end
// não carrega jsdom à toa.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'backend',
          root: RAIZ_BACKEND,
          environment: 'node',
          globals: true,
          include: ['tests/**/*.test.js'],
          setupFiles: [path.join(RAIZ_BACKEND, 'tests', 'setup.js')],
          globalSetup: [path.join(RAIZ_BACKEND, 'tests', 'global-setup.js')],
          // Os arquivos compartilham o mesmo banco e cada um limpa as
          // tabelas no beforeEach; em paralelo, um apagaria os dados do
          // outro.
          fileParallelism: false,
          pool: 'forks',
          testTimeout: 20000,
          hookTimeout: 30000
        }
      },
      {
        // A raiz continua sendo a do backend, mesmo para os testes de
        // front-end: apontar `root` para fora da pasta da config faz o
        // Vitest perder o prefixo do caminho no Windows e procurar o
        // arquivo em '/tests/...'. O include alcança a outra pasta, e
        // server.fs.allow autoriza o Vite a servi-la.
        test: {
          name: 'frontend',
          root: RAIZ_BACKEND,
          environment: 'jsdom',
          globals: true,
          include: ['../frontend/tests/**/*.test.js']
        },
        server: {
          fs: { allow: [path.join(AQUI, '..')] }
        }
      }
    ],

    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.js'],
      exclude: ['src/server.js']
    }
  }
});
