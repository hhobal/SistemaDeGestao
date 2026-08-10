// ======================================
// LIMITE DE TENTATIVAS DE LOGIN
// ======================================
// Em NODE_ENV=test o limitador fica desligado (middleware/rateLimit.js),
// senão as outras suítes receberiam 429 ao fazer login várias vezes.
// Aqui montamos uma aplicação Express isolada com o limitador ligado
// de verdade, para exercitar o comportamento real.

const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');

function appDeTeste({ maximo = 3 } = {}) {
  const app = express();
  app.use(express.json());

  const limitador = rateLimit({
    windowMs: 60 * 1000,
    limit: maximo,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.' },
    handler: (req, res, next, opcoes) => res.status(opcoes.statusCode).json(opcoes.message)
  });

  app.post('/login', limitador, (req, res) => {
    if (req.body.senha === 'correta') return res.json({ token: 'abc' });
    res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  });

  return app;
}

describe('Limite de tentativas de login', () => {
  it('bloqueia com 429 após esgotar as tentativas', async () => {
    const app = appDeTeste({ maximo: 3 });

    for (let i = 0; i < 3; i++) {
      const r = await request(app).post('/login').send({ senha: 'errada' });
      expect(r.status).toBe(401);
    }

    const bloqueado = await request(app).post('/login').send({ senha: 'errada' });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.erro).toMatch(/muitas tentativas/i);
  });

  it('não consome cota quando o login dá certo', async () => {
    const app = appDeTeste({ maximo: 3 });

    // Dez logins bem-sucedidos não podem esgotar o limite — senão um
    // usuário legítimo seria bloqueado só por usar o sistema.
    for (let i = 0; i < 10; i++) {
      const r = await request(app).post('/login').send({ senha: 'correta' });
      expect(r.status).toBe(200);
    }

    const aindaPermitido = await request(app).post('/login').send({ senha: 'errada' });
    expect(aindaPermitido.status).toBe(401);
  });

  it('anuncia o limite nos cabeçalhos', async () => {
    const app = appDeTeste({ maximo: 3 });
    const r = await request(app).post('/login').send({ senha: 'errada' });
    expect(r.headers['ratelimit-policy'] ?? r.headers['ratelimit']).toBeDefined();
  });
});

describe('Limitador desligado em ambiente de teste', () => {
  it('não interfere nas outras suítes', async () => {
    // Confirma a decisão tomada em middleware/rateLimit.js: com
    // NODE_ENV=test o limitador vira um middleware transparente.
    process.env.NODE_ENV = 'test';
    delete require.cache[require.resolve('../src/middleware/rateLimit')];
    delete require.cache[require.resolve('../src/config/env')];
    const { limitarLogin } = require('../src/middleware/rateLimit');

    const app = express();
    app.use(express.json());
    app.post('/login', limitarLogin, (req, res) => res.status(401).json({ erro: 'x' }));

    for (let i = 0; i < 15; i++) {
      const r = await request(app).post('/login').send({});
      expect(r.status).toBe(401); // nunca 429
    }
  });
});
