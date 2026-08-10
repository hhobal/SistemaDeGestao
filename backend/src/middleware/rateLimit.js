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

function limitador({ janelaMinutos, maximo, mensagem }) {
  if (desligado) return (req, res, next) => next();

  return rateLimit({
    windowMs: janelaMinutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
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

module.exports = { limitarLogin, limitarCadastro };
