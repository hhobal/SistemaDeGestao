// ======================================
// SEED — DADOS INICIAIS
// ======================================
// Roda com: npm run seed
// Cria o usuário Administrador inicial (a partir do .env) e alguns
// registros de exemplo para você já abrir o sistema com algo na tela.
// É seguro rodar mais de uma vez: registros já existentes não são duplicados.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const usuarioAdmin = process.env.SEED_ADMIN_USUARIO || 'admin';
  const senhaAdmin = process.env.SEED_ADMIN_SENHA || 'admin123';
  const nomeAdmin = process.env.SEED_ADMIN_NOME || 'Administrador';

  const adminExistente = await prisma.usuario.findUnique({ where: { usuario: usuarioAdmin } });
  if (!adminExistente) {
    const senhaHash = await bcrypt.hash(senhaAdmin, 10);
    await prisma.usuario.create({
      data: { nome: nomeAdmin, usuario: usuarioAdmin, senhaHash, perfil: 'Administrador' }
    });
    console.log(`✔ Usuário administrador criado: "${usuarioAdmin}" / senha definida no .env`);
  } else {
    console.log(`• Usuário administrador "${usuarioAdmin}" já existe, mantido como está.`);
  }

  const totalProdutos = await prisma.produto.count();
  if (totalProdutos === 0) {
    await prisma.produto.createMany({
      data: [
        { nome: 'Camiseta Básica', codigo: 'CAM-001', categoria: 'Vestuário', preco: 49.9, custo: 22, estoque: 40, estoqueMin: 10 },
        { nome: 'Caneca de Cerâmica', codigo: 'CAN-002', categoria: 'Casa', preco: 29.9, custo: 12, estoque: 25, estoqueMin: 5 },
        { nome: 'Boné Trucker', codigo: 'BON-003', categoria: 'Acessórios', preco: 39.9, custo: 18, estoque: 2, estoqueMin: 5 }
      ]
    });
    console.log('✔ Produtos de exemplo criados.');
  }

  const totalFornecedores = await prisma.fornecedor.count();
  if (totalFornecedores === 0) {
    await prisma.fornecedor.create({
      data: { empresa: 'Distribuidora Exemplo Ltda', contato: 'João Silva', telefone: '(11) 90000-0000', categoria: 'Vestuário' }
    });
    console.log('✔ Fornecedor de exemplo criado.');
  }

  console.log('\nSeed concluído.');
}

main()
  .catch((erro) => {
    console.error('Erro ao rodar o seed:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
