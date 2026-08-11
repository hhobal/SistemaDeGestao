// ======================================
// HELPERS DOS TESTES DE FRONT-END
// ======================================
// O front-end não usa bundler: os arquivos de js/ são scripts clássicos
// que declaram funções no escopo global, e o navegador as junta pela
// ordem das tags <script>. Para testar sem mudar essa arquitetura,
// carregamos cada arquivo com eval indireto, que executa no escopo
// global do jsdom — exatamente como a tag <script> faria.
//
// `eval` costuma ser sinal de problema. Aqui o conteúdo é um arquivo do
// próprio repositório, escolhido pelo teste; não há entrada externa.

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');

function carregarScript(caminhoRelativo) {
  const codigo = fs.readFileSync(path.join(RAIZ, caminhoRelativo), 'utf8');
  // (0, eval) força a avaliação no escopo global. Um eval() direto
  // criaria as funções dentro do escopo desta função, invisíveis para
  // o teste.
  (0, eval)(codigo);
}

// Monta o DOM mínimo que a função sendo testada espera encontrar.
function montarDom(html) {
  document.body.innerHTML = html;
}

// Muitos módulos chamam helpers globais definidos em app.js (toast,
// paginação, estado vazio). Carregar app.js inteiro traria dependências
// demais, então substituímos por versões neutras.
function instalarDependenciasComuns() {
  globalThis.mostrarNotificacao = () => {};
  globalThis.renderizarPaginacao = () => {};
  globalThis.abrirConfirmacao = (msg, aoConfirmar) => aoConfirmar && aoConfirmar();
  globalThis.emptyState = mensagem => `<tr><td class="vazio">${mensagem}</td></tr>`;
  globalThis.atualizarTudo = () => {};
}

// Devolve o texto visível de um elemento, com espaços normalizados —
// evita que quebra de linha do template quebre a asserção.
function texto(seletor) {
  const el = document.querySelector(seletor);
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
}

module.exports = { carregarScript, montarDom, instalarDependenciasComuns, texto, RAIZ };
