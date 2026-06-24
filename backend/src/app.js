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

// ─── ROTA DE SAÚDE (útil para checar se o servidor está de pé) ──
app.get('/api/saude', (req, res) => {
  res.json({ ok: true, ambiente: env.ambiente, horario: new Date().toISOString() });
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
