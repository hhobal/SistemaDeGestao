// ======================================
// PONTO DE ENTRADA DO SERVIDOR
// ======================================
const app = require('./app');
const env = require('./config/env');
const prisma = require('./lib/prisma');

const servidor = app.listen(env.porta, () => {
  console.log(`\n  GestãoPro API rodando em http://localhost:${env.porta}`);
  console.log(`  Ambiente: ${env.ambiente}`);
  console.log(`  Teste rápido: http://localhost:${env.porta}/api/saude\n`);
});

// Encerramento gracioso: fecha a conexão com o banco antes de sair,
// importante para não deixar conexões "penduradas" no PostgreSQL.
async function encerrar(sinal) {
  console.log(`\nRecebido ${sinal}, encerrando servidor...`);
  servidor.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));
