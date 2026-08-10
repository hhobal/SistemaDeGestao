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

// Em produção a API roda atrás do proxy do Render. Sem isto, req.ip
// devolve o endereço do proxy para todo mundo: o limitador de tentativas
// de login contaria todos os usuários no mesmo balde e 10 erros de senha
// de um visitante bloqueariam o sistema inteiro. O valor 1 confia apenas
// no proxy imediatamente à frente — confiar em toda a cadeia permitiria
// forjar o IP pelo cabeçalho X-Forwarded-For e escapar do limite.
if (env.ambiente === 'production') {
  app.set('trust proxy', 1);
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

  const corpo = {
    ok: banco === 'ok',
    ambiente: env.ambiente,
    banco,
    latenciaBanco,
    horario: new Date().toISOString()
  };

  // TEMPORÁRIO: diagnóstico da cadeia de proxy, para descobrir de qual
  // cabeçalho extrair o IP real do cliente no limitador de tentativas.
  // Mostra apenas o endereço de quem fez a chamada — nada de terceiros.
  if (req.query.debug === 'rede') {
    corpo.rede = {
      ip: req.ip,
      ips: req.ips,
      xForwardedFor: req.headers['x-forwarded-for'] || null,
      cfConnectingIp: req.headers['cf-connecting-ip'] || null,
      trueClientIp: req.headers['true-client-ip'] || null,
      xRealIp: req.headers['x-real-ip'] || null,
      trustProxy: req.app.get('trust proxy')
    };
  }

  res.json(corpo);
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
