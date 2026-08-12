import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// A API roda separada (Express, pasta backend/). Em desenvolvimento o
// proxy evita CORS e faz o navegador enxergar tudo na mesma origem;
// em produção o endereço vem de VITE_API_URL (ver src/comum/api.ts).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // '@' aponta para src/. Sem isso, uma tela dentro de modulos/ acessaria
  // o código compartilhado por '../../comum/api' — caminho que muda toda
  // vez que um arquivo troca de pasta. O tsconfig declara o mesmo apelido
  // para o editor e o compilador enxergarem igual.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
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
