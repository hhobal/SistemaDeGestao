// ======================================
// LIMITE DE REQUISIÇÕES
// ======================================
// Sem isto, /auth/login aceita tentativas ilimitadas: um script testa
// milhares de senhas por minuto até acertar. O risco é concreto porque
// a tela de login anuncia o usuário padrão (admin), então o atacante já
// começa sabendo metade da credencial.

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Em teste o limite atrapalharia: várias asserções fazem login em
// sequência e passariam a receber 429 por motivo alheio ao teste.
const desligado = env.ambiente === 'test';

// ─── IDENTIFICAÇÃO DO CLIENTE ───────────────────────────
// Em produção a requisição atravessa Cloudflare e o balanceador do
// Render antes de chegar aqui, deixando três endereços no cabeçalho:
//
//   X-Forwarded-For: <cliente>, <cloudflare>, <render>
//
// O req.ip do Express resolve para o último — um IP interno do Render
// que muda a cada requisição. Usá-lo como chave dava a cada tentativa
// um balde novo, e o limite nunca era atingido.
//
// CF-Connecting-IP carrega o cliente real. O Cloudflare sobrescreve
// esse cabeçalho em toda requisição que passa por ele, então o
// visitante não consegue forjá-lo para escapar do limite.
function normalizarIp(ip) {
  if (!ip) return 'desconhecido';

  // IPv6: agrupa pelo prefixo /64. Um único assinante costuma receber
  // um bloco inteiro, e sem isso bastaria trocar o final do endereço a
  // cada tentativa para nunca ser bloqueado.
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + '::/64';
  }
  return ip;
}

function ipDoCliente(req) {
  const cabecalho = req.headers['cf-connecting-ip'] || req.headers['true-client-ip'];
  const ip = (typeof cabecalho === 'string' && cabecalho.trim()) || req.ip || '';
  return normalizarIp(ip.trim());
}

function limitador({ janelaMinutos, maximo, mensagem }) {
  if (desligado) return (req, res, next) => next();

  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: ipDoCliente,
    // Conta apenas tentativas malsucedidas: quem acerta a senha não
    // gasta cota, então o usuário legítimo nunca é bloqueado por usar
    // o sistema normalmente.
    skipSuccessfulRequests: true,
    message: { erro: mensagem },
    handler: (req, res, next, opcoes) => {
      res.status(opcoes.statusCode).json(opcoes.message);
    }
  });
}

// Login: restritivo. 10 erros em 15 minutos é muito acima do que um
// humano que esqueceu a senha precisa, e muito abaixo do que uma
// varredura automatizada exige para ser viável.
const limitarLogin = limitador({
  janelaMinutos: 15,
  maximo: 10,
  mensagem: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.'
});

// Cadastro na loja: impede criação de contas em massa.
const limitarCadastro = limitador({
  janelaMinutos: 60,
  maximo: 20,
  mensagem: 'Muitas contas criadas a partir deste endereço. Tente novamente mais tarde.'
});

module.exports = { limitarLogin, limitarCadastro, ipDoCliente, normalizarIp };
