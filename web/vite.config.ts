import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// A API roda separada (Express, pasta backend/). Em desenvolvimento o
// proxy evita CORS e faz o navegador enxergar tudo na mesma origem;
// em produção o endereço vem de VITE_API_URL (ver src/lib/api.ts).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
