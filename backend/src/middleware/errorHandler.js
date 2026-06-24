// ======================================
// TRATAMENTO CENTRAL DE ERROS
// ======================================
const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Erros esperados (criados com ApiError.*)
  if (err instanceof ApiError) {
    return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes });
  }

  // Violação de campo único no banco (e-mail/CPF/código já cadastrado etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const campo = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target;
    return res.status(409).json({ erro: `Já existe um registro com este valor em "${campo}".` });
  }

  // Registro referenciado não encontrado (ex.: clienteId inexistente)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return res.status(404).json({ erro: 'Registro não encontrado.' });
  }

  // Erro de validação do Zod (formato { errors: [...] })
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      erro: 'Dados inválidos.',
      detalhes: err.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message }))
    });
  }

  // JSON malformado no corpo da requisição
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  // Qualquer outro erro não previsto: loga no servidor, não vaza detalhe interno
  console.error('[ERRO NÃO TRATADO]', err);
  res.status(500).json({
    erro: 'Erro interno do servidor.',
    ...(env.ambiente === 'development' ? { detalhes: err.message, stack: err.stack } : {})
  });
}

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, rotaNaoEncontrada };
