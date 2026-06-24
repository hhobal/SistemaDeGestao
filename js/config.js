// ======================================
// CONFIGURAÇÃO DO FRONT-END
// ======================================
// Único lugar que precisa ser editado se o backend rodar em outro
// endereço/porta (ex.: ao publicar em um servidor real). Tanto o painel
// (js/api.js) quanto a loja (js/loja-api.js) leem essa variável global.
//
// IMPORTANTE: o backend também precisa liberar o endereço de onde estas
// páginas são abertas na variável CORS_ORIGINS do arquivo backend/.env
// (veja o backend/README.md, seção "Rodando localmente").

window.__API_BASE_URL__ = 'http://localhost:3000/api';
