// ======================================
// CONFIGURAÇÃO CENTRALIZADA (lê o .env uma vez só)
// ======================================
require('dotenv').config();

function obrigatoria(nome, valorPadrao = undefined) {
  const valor = process.env[nome] ?? valorPadrao;
  if (valor === undefined) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}. Confira o seu arquivo .env (veja .env.example).`);
  }
  return valor;
}

const env = {
  porta: parseInt(process.env.PORT || '3001', 10),
  ambiente: process.env.NODE_ENV || 'development',

  jwtSecret: obrigatoria('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  jwtLojaSecret: obrigatoria('JWT_LOJA_SECRET'),
  jwtLojaExpiresIn: process.env.JWT_LOJA_EXPIRES_IN || '30d',

  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),

  seedAdmin: {
    usuario: process.env.SEED_ADMIN_USUARIO || 'admin',
    senha: process.env.SEED_ADMIN_SENHA || 'admin123',
    nome: process.env.SEED_ADMIN_NOME || 'Administrador'
  }
};

module.exports = env;
