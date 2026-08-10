// ======================================
// HELPERS DE BANCO PARA OS TESTES
// ======================================
const prisma = require('../../src/lib/prisma');
const { gerarHash } = require('../../src/utils/senha');

// A ordem importa: filhos antes dos pais, senão as chaves estrangeiras
// bloqueiam a exclusão.
const ORDEM_LIMPEZA = [
  'lancamento',
  'itemPedido',
  'movimento',
  'pedido',
  'ordemServico',
  'tarefa',
  'produto',
  'cliente',
  'usuario',
  'fornecedor',
  'evento',
  'nota',
  'logAcao',
  'contador'
];

async function limparBanco() {
  for (const modelo of ORDEM_LIMPEZA) {
    await prisma[modelo].deleteMany();
  }
}

// ─── FÁBRICAS ───────────────────────────────────────────
// Cada fábrica aceita sobrescritas parciais, para o teste declarar
// apenas o que é relevante para ele.

async function criarUsuario(dados = {}) {
  const { senha = 'senha123', ...resto } = dados;
  return prisma.usuario.create({
    data: {
      nome: 'Usuário Teste',
      usuario: `user_${Math.random().toString(36).slice(2, 10)}`,
      senhaHash: await gerarHash(senha),
      perfil: 'Administrador',
      ativo: true,
      ...resto
    }
  });
}

async function criarCliente(dados = {}) {
  const { senha, ...resto } = dados;
  return prisma.cliente.create({
    data: {
      nome: 'Cliente Teste',
      email: `cliente_${Math.random().toString(36).slice(2, 10)}@teste.com`,
      senhaHash: senha ? await gerarHash(senha) : null,
      ...resto
    }
  });
}

async function criarProduto(dados = {}) {
  return prisma.produto.create({
    data: {
      nome: 'Produto Teste',
      preco: 100,
      custo: 40,
      estoque: 10,
      ativo: true,
      ...dados
    }
  });
}

module.exports = {
  prisma,
  limparBanco,
  criarUsuario,
  criarCliente,
  criarProduto
};
