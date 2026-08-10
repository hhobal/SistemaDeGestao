import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,

    // Carregado antes de qualquer import da aplicação: aponta o
    // DATABASE_URL para o banco de teste e define segredos próprios.
    setupFiles: ['./tests/setup.js'],

    // Cria o banco de teste uma vez, antes de toda a suíte.
    globalSetup: ['./tests/global-setup.js'],

    // Os arquivos de teste compartilham o mesmo banco SQLite e cada um
    // chama limparBanco() no beforeEach. Se rodassem em paralelo, um
    // apagaria os dados que o outro acabou de criar. Rodar um arquivo
    // por vez mantém tudo determinístico — a suíte leva ~5s de qualquer
    // forma.
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
