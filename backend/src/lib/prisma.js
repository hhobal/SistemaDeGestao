// ======================================
// PRISMA CLIENT — INSTÂNCIA ÚNICA
// ======================================
// Reutilizar uma única instância evita esgotar conexões com o banco,
// especialmente importante em produção com PostgreSQL.
const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

const prisma = new PrismaClient({
  log: env.ambiente === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
