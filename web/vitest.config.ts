import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    // Sem Tailwind aqui: o plugin dele processa CSS que os testes não
    // renderizam, e só deixaria a suíte mais lenta.
    css: false
  }
});
