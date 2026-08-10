// ======================================
// SETUP DOS TESTES — roda antes de cada arquivo de teste
// ======================================
// Precisa executar ANTES de qualquer `require` da aplicação, porque
// src/config/env.js e src/lib/prisma.js leem process.env no momento em
// que são importados.
//
// O dotenv não sobrescreve variáveis já definidas, então tudo que for
// atribuído aqui tem prioridade sobre o backend/.env do desenvolvedor.

require('dotenv').config();

// Banco exclusivo dos testes. Nunca aponte para o Supabase: a suíte
// apaga todas as tabelas a cada teste. O padrão abaixo casa com o
// container descrito em docs/TESTES.md.
const bancoDeTeste =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5434/gestaopro_test';

if (/supabase|amazonaws|render/i.test(bancoDeTeste)) {
  throw new Error(
    'TEST_DATABASE_URL aponta para um banco remoto. A suíte apaga todos ' +
    'os dados a cada teste — use um PostgreSQL local (ver docs/TESTES.md).'
  );
}

process.env.DATABASE_URL = bancoDeTeste;
process.env.DIRECT_URL = bancoDeTeste;

// Segredos fixos e previsíveis. São diferentes entre si de propósito:
// vários testes verificam que um token da loja não abre rota do painel.
process.env.JWT_SECRET = 'segredo-de-teste-painel-nao-usar-em-producao';
process.env.JWT_LOJA_SECRET = 'segredo-de-teste-loja-nao-usar-em-producao';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_LOJA_EXPIRES_IN = '1h';

process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = 'http://localhost:5500';
