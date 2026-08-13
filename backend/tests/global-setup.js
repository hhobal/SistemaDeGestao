// ======================================
// GLOBAL SETUP — roda UMA vez antes de toda a suíte
// ======================================
// Recria o schema no banco de teste a partir do schema.prisma usando
// `prisma db push`. Optamos por db push em vez de `migrate deploy` de
// propósito: a suíte passa a refletir sempre o estado atual do schema,
// sem depender do histórico de migrations.

const { execSync } = require('child_process');
const path = require('path');

const raizBackend = path.join(__dirname, '..');

module.exports = async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5434/gestiq_test';

  try {
    // --force-reset derruba e recria o schema: cada execução começa
    // de um banco limpo, sem resíduo da anterior.
    execSync('npx prisma db push --skip-generate --force-reset', {
      cwd: raizBackend,
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      stdio: 'pipe'
    });
  } catch (erro) {
    const saida = `${erro.stdout || ''}${erro.stderr || ''}`;
    throw new Error(
      'Não foi possível preparar o banco de teste.\n\n' +
      `URL: ${url}\n\n` +
      'O PostgreSQL de teste está no ar? Suba com:\n' +
      '  docker run --name gestiq-test-db -e POSTGRES_PASSWORD=postgres \\\n' +
      '    -e POSTGRES_DB=gestiq_test -p 5434:5432 -d postgres:16-alpine\n\n' +
      `Detalhe do Prisma:\n${saida}`
    );
  }
};
