// ======================================
// BACKUP — EXPORTAÇÃO E IMPORTAÇÃO COMPLETA
// ======================================
// Substitui o botão "Exportar dados" da versão localStorage, que
// baixava um JSON do navegador. Aqui o JSON vem do banco de verdade,
// então o backup tem todos os dados de todos os usuários do sistema,
// não só os do navegador de quem clicou.
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { registrarLog } = require('../services/log.service');

const exportar = asyncHandler(async (req, res) => {
  const [clientes, fornecedores, produtos, pedidos, ordensServico, lancamentos, eventos, tarefas, notas] = await Promise.all([
    prisma.cliente.findMany(),
    prisma.fornecedor.findMany(),
    prisma.produto.findMany(),
    prisma.pedido.findMany({ include: { itens: true } }),
    prisma.ordemServico.findMany(),
    prisma.lancamento.findMany(),
    prisma.evento.findMany(),
    prisma.tarefa.findMany(),
    prisma.nota.findMany()
  ]);

  const backup = {
    geradoEm: new Date().toISOString(),
    versao: 1,
    dados: {
      clientes: clientes.map(({ senhaHash, ...c }) => c), // eslint-disable-line no-unused-vars
      fornecedores,
      produtos,
      pedidos,
      ordensServico,
      lancamentos,
      eventos,
      tarefas,
      notas
    }
  };

  await registrarLog({ usuario: req.usuario?.nome, acao: 'Exportar', modulo: 'Backup' });

  res.setHeader('Content-Disposition', `attachment; filename="backup-gestiq-${Date.now()}.json"`);
  res.json(backup);
});

// Importação simples de clientes/fornecedores/produtos a partir de um
// backup gerado por este mesmo endpoint. Pedidos/O.S./lançamentos não
// são reimportados automaticamente porque envolvem relações e regras
// de negócio (estoque, numeração) que merecem revisão manual — para
// migrar a base antiga do localStorage, use o script dedicado
// scripts/migrar-localstorage.js.
const importar = asyncHandler(async (req, res) => {
  const { dados } = req.body;
  if (!dados) throw ApiError.badRequest('Arquivo de backup inválido: campo "dados" ausente.');

  const resultado = { clientes: 0, fornecedores: 0, produtos: 0 };

  await prisma.$transaction(async (tx) => {
    for (const c of dados.clientes || []) {
      await tx.cliente.upsert({
        where: { id: c.id },
        update: { nome: c.nome, email: c.email, telefone: c.telefone, cpf: c.cpf, endereco: c.endereco, status: c.status },
        create: { nome: c.nome, email: c.email, telefone: c.telefone, cpf: c.cpf, endereco: c.endereco, status: c.status || 'ativo' }
      });
      resultado.clientes++;
    }
    for (const f of dados.fornecedores || []) {
      await tx.fornecedor.upsert({
        where: { id: f.id },
        update: { empresa: f.empresa, contato: f.contato, telefone: f.telefone, email: f.email, cnpj: f.cnpj, categoria: f.categoria },
        create: { empresa: f.empresa, contato: f.contato, telefone: f.telefone, email: f.email, cnpj: f.cnpj, categoria: f.categoria }
      });
      resultado.fornecedores++;
    }
    for (const p of dados.produtos || []) {
      await tx.produto.upsert({
        where: { id: p.id },
        update: { nome: p.nome, codigo: p.codigo, categoria: p.categoria, preco: p.preco, custo: p.custo, estoque: p.estoque, estoqueMin: p.estoqueMin },
        create: { nome: p.nome, codigo: p.codigo, categoria: p.categoria, preco: p.preco, custo: p.custo, estoque: p.estoque, estoqueMin: p.estoqueMin }
      });
      resultado.produtos++;
    }
  });

  await registrarLog({ usuario: req.usuario?.nome, acao: 'Importar', modulo: 'Backup', detalhe: JSON.stringify(resultado) });
  res.json({ ok: true, importados: resultado });
});

module.exports = { exportar, importar };
