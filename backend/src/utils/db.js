// ======================================
// BUSCA CASE-INSENSITIVE — COMPATÍVEL SQLite / PostgreSQL
// ======================================
// O Prisma só aceita `mode: 'insensitive'` em filtros `contains`/`equals`
// quando o provider é PostgreSQL (ou MongoDB). No SQLite, esse parâmetro
// quebra a query. Esta função devolve o objeto certo para cada caso,
// então os controllers não precisam saber qual banco está em uso.
const ehPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

function modoBusca() {
  return ehPostgres ? { mode: 'insensitive' } : {};
}

module.exports = { modoBusca };
