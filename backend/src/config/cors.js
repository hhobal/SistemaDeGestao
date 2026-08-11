// ======================================
// ORIGENS AUTORIZADAS (CORS)
// ======================================
// A Vercel gera um domínio novo a cada deploy de preview
// (gestaopro-web-a1b2c3-usuario.vercel.app). Listar um por um é
// impraticável, então CORS_ORIGINS aceita curinga:
//
//   CORS_ORIGINS="https://gestaopro.vercel.app,https://gestaopro-*.vercel.app"
//
// O curinga cobre só o trecho onde está o `*`, e nunca atravessa um
// ponto. Isso importa: `https://*.vercel.app` autorizaria
// `https://site-de-terceiro.vercel.app`, mas não
// `https://qualquer.coisa.vercel.app` — e mesmo assim é permissivo
// demais para produção. Prefira prefixos específicos do seu projeto.

/**
 * Converte um padrão com `*` em expressão regular ancorada.
 * Tudo é escapado antes, então um ponto no padrão só casa com ponto.
 */
function paraRegex(padrao) {
  const escapado = padrao
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escapa tudo, inclusive o *
    .replace(/\\\*/g, '[^.]*');             // devolve ao * o papel de curinga
  return new RegExp(`^${escapado}$`);
}

/**
 * Monta a função que o middleware `cors` usa para decidir cada origem.
 *
 * Sem nenhuma origem configurada, libera geral — o padrão do
 * desenvolvimento local, onde o front pode subir em qualquer porta.
 */
function criarVerificadorDeOrigem(origens) {
  if (!origens || origens.length === 0) return true;

  // O trim vale para os dois casos: CORS_ORIGINS é uma lista separada
  // por vírgula digitada à mão, e um espaço sobrando faria a origem
  // nunca casar — com o sintoma aparecendo só no navegador, como erro
  // de CORS sem explicação.
  const limpas = origens.map(origem => origem.trim()).filter(Boolean);
  const exatas = new Set(limpas.filter(o => !o.includes('*')));
  const padroes = limpas.filter(o => o.includes('*')).map(paraRegex);

  return (origem, retorno) => {
    // Requisição sem cabeçalho Origin (curl, health check do Render,
    // app nativo) não é uma chamada de navegador e não passa por CORS.
    if (!origem) return retorno(null, true);

    const permitida = exatas.has(origem) || padroes.some(regex => regex.test(origem));
    if (permitida) return retorno(null, true);

    // Recusar sem erro: o navegador já bloqueia a resposta por não
    // encontrar o cabeçalho. Lançar erro aqui só encheria o log do
    // servidor com ruído causado por terceiros.
    return retorno(null, false);
  };
}

module.exports = { criarVerificadorDeOrigem, paraRegex };
