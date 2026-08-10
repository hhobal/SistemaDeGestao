// ======================================
// APLICAÇÃO EXPRESS — MONTAGEM CENTRAL
// ======================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const { errorHandler, rotaNaoEncontrada } = require('./middleware/errorHandler');

const app = express();

// Em produção a requisição atravessa Cloudflare e o balanceador interno
// do Render antes de chegar aqui. Confiamos apenas nos endereços de rede
// privada (o salto do Render, 10.x) em vez de um número fixo de saltos:
// o tamanho da cadeia é detalhe da infraestrutura e pode mudar sem aviso.
//
// `true` seria mais simples e mais errado — aceitaria qualquer
// X-Forwarded-For enviado pelo visitante, deixando-o forjar o próprio IP.
//
// A identificação do cliente para o limite de tentativas não depende
// disto: usa CF-Connecting-IP (ver middleware/rateLimit.js).
if (env.ambiente === 'production') {
  app.set('trust proxy', ['loopback', 'uniquelocal']);
}

// ─── MIDDLEWARES GLOBAIS ────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
if (env.ambiente === 'development') {
  app.use(morgan('dev'));
}

// ─── ROTA DE SAÚDE ──────────────────────────────────────
// Consulta o banco de propósito, por dois motivos:
//   1. Um health check que não toca no banco não prova quase nada —
//      a API pode estar "de pé" e incapaz de responder qualquer rota útil.
//   2. No plano gratuito, o Supabase pausa o projeto após dias sem
//      atividade. Como este endpoint é o alvo do ping periódico que
//      impede o Render de hibernar, fazê-lo consultar o banco mantém
//      os dois acordados com uma requisição só.
//
// Responde 200 mesmo se o banco falhar, sinalizando o problema no corpo.
// Devolver 5xx faria o Render considerar a instância defeituosa e
// reiniciá-la a cada oscilação do banco — o processo Express, esse,
// está de fato no ar.
app.get('/api/saude', async (req, res) => {
  const prisma = require('./lib/prisma');
  let banco = 'ok';
  let latenciaBanco = null;

  const inicio = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    latenciaBanco = Date.now() - inicio;
  } catch (erro) {
    banco = 'erro';
    console.error('[SAUDE] Banco inacessível:', erro.message);
  }

  res.json({
    ok: banco === 'ok',
    ambiente: env.ambiente,
    banco,
    latenciaBanco,
    horario: new Date().toISOString()
  });
});

// ─── ROTAS — PAINEL ADMINISTRATIVO (EQUIPE INTERNA) ─────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/fornecedores', require('./routes/fornecedores.routes'));
app.use('/api/produtos', require('./routes/produtos.routes'));
app.use('/api/pedidos', require('./routes/pedidos.routes'));
app.use('/api/os', require('./routes/os.routes'));
app.use('/api/estoque', require('./routes/estoque.routes'));
app.use('/api/financas', require('./routes/financas.routes'));
app.use('/api/agenda', require('./routes/agenda.routes'));
app.use('/api/tarefas', require('./routes/tarefas.routes'));
app.use('/api/notas', require('./routes/notas.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/relatorios', require('./routes/relatorios.routes'));
app.use('/api/backup', require('./routes/backup.routes'));

// ─── ROTAS — LOJA VIRTUAL (CLIENTE FINAL) ───────────────
app.use('/api/loja', require('./routes/loja.routes'));

// ─── 404 E TRATAMENTO DE ERROS (sempre por último) ──────
app.use(rotaNaoEncontrada);
app.use(errorHandler);

module.exports = app;
