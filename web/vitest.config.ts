import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Este arquivo substitui o vite.config.ts durante os testes, então o
// apelido '@' precisa ser repetido aqui — senão os imports resolvem no
// build e quebram na suíte.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    // Os testes ficam ao lado do código que exercitam, dentro de cada
    // módulo — não numa pasta espelho.
    include: ['src/**/*.test.{ts,tsx}'],
    // Sem Tailwind aqui: o plugin dele processa CSS que os testes não
    // renderizam, e só deixaria a suíte mais lenta.
    css: false
  }
});
