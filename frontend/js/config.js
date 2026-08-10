// ======================================
// CONFIGURAÇÃO DO FRONT-END
// ======================================
// Define o endereço da API conforme o ambiente em que a página está
// aberta. Como o front-end é estático (sem build step), não existe
// process.env aqui — a detecção é feita pelo hostname.
//
// Tanto o painel (js/api.js) quanto a loja (js/loja-api.js) leem a
// variável global window.__API_BASE_URL__ definida no final do arquivo.
//
// IMPORTANTE: o backend precisa liberar o endereço de onde estas páginas
// são abertas na variável CORS_ORIGINS do backend/.env — senão o
// navegador bloqueia as chamadas mesmo com a URL correta aqui.

(function definirApiBaseUrl() {
    const host = window.location.hostname;

    // Rodando na própria máquina (Live Server, http.server, etc.)
    const ehLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '' ||                 // arquivo aberto via file://
        host.startsWith('192.168.') || // acesso pela rede local
        host.startsWith('10.');

    // API publicada no Render. O subdomínio tem o sufixo "-wthk" porque
    // "gestaopro-api" já estava em uso — nomes .onrender.com são únicos
    // globalmente. Se o serviço for recriado, confira a URL no painel.
    const API_PRODUCAO = 'https://gestaopro-api-wthk.onrender.com/api';

    const API_LOCAL = 'http://localhost:3001/api';

    window.__API_BASE_URL__ = ehLocal ? API_LOCAL : API_PRODUCAO;

    // Deixa explícito no console qual backend está em uso — economiza
    // muito tempo de depuração quando a tela dá "erro de conexão".
    console.info(`[GestãoPro] API: ${window.__API_BASE_URL__}`);
})();
