// ======================================
// MIGRAÇÃO: localStorage (V6) → BANCO DE DADOS
// ======================================
// USO:
//   node scripts/migrar-localstorage.js <backup-erp.json> [loja-clientes.json]
//
// 1) No sistema ANTIGO, clique em "Exportar dados" (gera um arquivo
//    chamado algo como backup-erp-2026-06-20.json). Esse é o 1º argumento.
//
// 2) Os clientes que criaram conta na LOJA ficam numa chave separada do
//    navegador (loja_clientes), que o botão de exportar não inclui. Se
//    quiser trazer esses cadastros (com senha) também, abra o Console
//    do navegador (F12) na página da loja antiga e rode:
//      copy(localStorage.getItem('loja_clientes'))
//    Cole o conteúdo copiado num arquivo loja-clientes.json e passe
//    como 2º argumento. Esse passo é OPCIONAL: mesmo sem ele, os
//    clientes que JÁ fizeram pedidos são recuperados automaticamente
//    (o nome/e-mail deles fica salvo dentro de cada pedido).
//
// O script é seguro para revisar antes de rodar de verdade: ele só
// GRAVA no banco depois de mostrar um resumo do que foi encontrado.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── HELPERS DE DATA ────────────────────────────────────
// O sistema antigo salvava datas como string "DD/MM/AAAA" (toLocaleDateString
// pt-BR) na maioria dos módulos, mas a Agenda usa "AAAA-MM-DD" (input
// type="date" do navegador). Esta função aceita os dois formatos.
function parseDataAntiga(valor) {
  if (!valor) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return new Date(valor);
  const m = String(valor).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const tentativa = new Date(valor);
  return isNaN(tentativa.getTime()) ? new Date() : tentativa;
}

function lerJSON(caminho) {
  const conteudo = fs.readFileSync(path.resolve(caminho), 'utf-8');
  return JSON.parse(conteudo);
}

async function main() {
  const [, , caminhoBackup, caminhoLojaClientes] = process.argv;
  if (!caminhoBackup) {
    console.error('Uso: node scripts/migrar-localstorage.js <backup-erp.json> [loja-clientes.json]');
    process.exit(1);
  }

  const backup = lerJSON(caminhoBackup);
  const lojaClientes = caminhoLojaClientes ? lerJSON(caminhoLojaClientes) : [];

  const resumo = {
    usuarios: 0, produtos: 0, fornecedores: 0, clientes: 0,
    pedidos: 0, itensPedido: 0, ordensServico: 0, lancamentos: 0,
    eventos: 0, tarefas: 0, notas: 0, movimentos: 0,
    avisos: []
  };

  await prisma.$transaction(async (tx) => {
    // ─── 1. USUÁRIOS (senha em texto puro → hash) ───────
    const mapaUsuarios = new Map(); // id antigo -> id novo
    for (const u of backup.usuarios || []) {
      const senhaHash = await bcrypt.hash(String(u.senha || Math.random().toString(36)), 10);
      const criado = await tx.usuario.upsert({
        where: { usuario: u.usuario },
        update: {},
        create: { nome: u.nome, usuario: u.usuario, senhaHash, perfil: u.perfil || 'Operador' }
      });
      mapaUsuarios.set(String(u.id), criado.id);
      resumo.usuarios++;
    }

    // ─── 2. PRODUTOS ─────────────────────────────────────
    const mapaProdutos = new Map(); // id antigo -> id novo
    const produtosPorNome = new Map(); // nome -> id novo (para casar movimentos antigos, que só guardavam o nome)
    for (const p of backup.produtos || []) {
      const criado = await tx.produto.create({
        data: {
          nome: p.nome,
          codigo: p.codigo || null,
          categoria: p.categoria || '',
          preco: Number(p.preco) || 0,
          custo: Number(p.custo) || 0,
          estoque: Number(p.estoque) || 0,
          estoqueMin: Number(p.estoqueMin) || 0
        }
      });
      mapaProdutos.set(String(p.id), criado.id);
      produtosPorNome.set(p.nome, criado.id);
      resumo.produtos++;
    }

    // ─── 3. FORNECEDORES ─────────────────────────────────
    for (const f of backup.fornecedores || []) {
      await tx.fornecedor.create({
        data: { empresa: f.empresa, contato: f.contato || '', telefone: f.telefone || '', email: f.email || '', cnpj: f.cnpj || '', categoria: f.categoria || '' }
      });
      resumo.fornecedores++;
    }

    // ─── 4. CLIENTES (unifica erp_clientes + loja_clientes) ──
    // Estratégia: agrupar por e-mail (chave mais confiável entre as
    // duas origens). Mantemos dois mapas de tradução de ID, pois
    // pedidos referenciam o ID da loja e O.S. referenciam o ID do ERP.
    const mapaClientesPorIdErp = new Map();
    const mapaClientesPorIdLoja = new Map();
    const clientesPorEmail = new Map(); // email -> id novo

    async function obterOuCriarCliente({ nome, email, telefone, cpf, endereco, status, senhaPura }) {
      const chave = (email || '').toLowerCase().trim();
      if (chave && clientesPorEmail.has(chave)) {
        const idExistente = clientesPorEmail.get(chave);
        // Enriquecer com dados que possam estar faltando (ex.: senha da loja)
        if (senhaPura) {
          const senhaHash = await bcrypt.hash(senhaPura, 10);
          await tx.cliente.update({ where: { id: idExistente }, data: { senhaHash, origem: 'loja' } });
        }
        return idExistente;
      }

      const senhaHash = senhaPura ? await bcrypt.hash(senhaPura, 10) : null;
      const criado = await tx.cliente.create({
        data: {
          nome: nome || 'Cliente sem nome',
          email: chave || null,
          telefone: telefone || '',
          cpf: cpf || null,
          endereco: endereco || '',
          status: status || 'ativo',
          senhaHash,
          origem: senhaPura ? 'loja' : 'manual'
        }
      });
      if (chave) clientesPorEmail.set(chave, criado.id);
      resumo.clientes++;
      return criado.id;
    }

    for (const c of backup.clientes || []) {
      const novoId = await obterOuCriarCliente({
        nome: c.nome, email: c.email, telefone: c.telefone, cpf: c.cpf, endereco: c.endereco, status: c.status
      });
      mapaClientesPorIdErp.set(String(c.id), novoId);
    }
    for (const c of lojaClientes) {
      const novoId = await obterOuCriarCliente({
        nome: c.nome, email: c.email, telefone: c.telefone, cpf: c.cpf, endereco: c.endereco, senhaPura: c.senha
      });
      mapaClientesPorIdLoja.set(String(c.id), novoId);
    }

    // ─── 5. PEDIDOS + ITENS (importados como histórico — não
    // re-executa a lógica de baixa de estoque, pois o estoque
    // já veio ajustado no backup dos produtos) ──────────────
    const mapaPedidos = new Map(); // id antigo -> id novo
    for (const p of backup.pedidos || []) {
      let clienteId = mapaClientesPorIdLoja.get(String(p.clienteId));
      if (!clienteId) {
        // Pedido sem o cadastro de loja_clientes correspondente: recupera
        // o cliente a partir dos dados que já vêm embutidos no próprio pedido.
        clienteId = await obterOuCriarCliente({
          nome: p.clienteNome, email: p.clienteEmail, telefone: p.clienteTelefone
        });
      }

      const itensValidos = (p.itens || []).filter(i => mapaProdutos.has(String(i.produtoId)));
      if (itensValidos.length < (p.itens || []).length) {
        resumo.avisos.push(`Pedido #${p.nro}: ${(p.itens||[]).length - itensValidos.length} item(ns) referenciavam produto(s) excluído(s) e foram ignorados.`);
      }

      const criado = await tx.pedido.create({
        data: {
          numero: String(p.nro || '0000'),
          clienteId,
          enderecoEntrega: p.enderecoEntrega || '',
          total: Number(p.total) || 0,
          pagamento: p.pagamento || 'pix',
          parcelas: Number(p.parcelas) || 1,
          status: p.status || 'pendente',
          data: parseDataAntiga(p.dataISO || p.data),
          itens: {
            create: itensValidos.map(i => ({
              produtoId: mapaProdutos.get(String(i.produtoId)),
              nome: i.nome,
              precoUnitario: Number(i.precoUnitario) || 0,
              quantidade: Number(i.qtd) || 1,
              subtotal: Number(i.subtotal) || 0
            }))
          }
        }
      });
      mapaPedidos.set(String(p.id), criado.id);
      resumo.pedidos++;
      resumo.itensPedido += itensValidos.length;
    }

    // ─── 6. ORDENS DE SERVIÇO ────────────────────────────
    const mapaOS = new Map();
    for (const os of backup.os || []) {
      const clienteId = os.clienteId ? mapaClientesPorIdErp.get(String(os.clienteId)) : null;
      const responsavelId = os.responsavelId ? mapaUsuarios.get(String(os.responsavelId)) : null;
      if (os.clienteId && !clienteId) resumo.avisos.push(`O.S. #${os.nro}: cliente original não encontrado, ficou sem cliente vinculado.`);

      const criada = await tx.ordemServico.create({
        data: {
          numero: String(os.nro || '0000'),
          titulo: os.titulo,
          descricao: os.descricao || '',
          observacao: os.observacao || '',
          status: os.status || 'aberta',
          prioridade: os.prioridade || 'normal',
          valor: Number(os.valor) || 0,
          clienteId,
          responsavelId,
          dataAbertura: parseDataAntiga(os.dataAbertura),
          dataConclusao: os.dataConclusao ? parseDataAntiga(os.dataConclusao) : null
        }
      });
      mapaOS.set(String(os.id), criada.id);
      resumo.ordensServico++;
    }

    // ─── 7. LANÇAMENTOS FINANCEIROS ──────────────────────
    for (const l of backup.lancamentos || []) {
      const pedidoId = l.pedidoId ? mapaPedidos.get(String(l.pedidoId)) : null;
      await tx.lancamento.create({
        data: {
          descricao: l.descricao,
          categoria: l.categoria || '',
          tipo: l.tipo,
          valor: Number(l.valor) || 0,
          status: l.status || 'pendente',
          data: parseDataAntiga(l.data),
          pedidoId
        }
      });
      resumo.lancamentos++;
    }

    // ─── 8. AGENDA ───────────────────────────────────────
    for (const e of backup.eventos || []) {
      await tx.evento.create({
        data: { titulo: e.titulo, data: parseDataAntiga(e.data), hora: e.hora || '', descricao: e.descricao || '', tipo: e.tipo || 'outro' }
      });
      resumo.eventos++;
    }

    // ─── 9. TAREFAS ──────────────────────────────────────
    for (const t of backup.tarefas || []) {
      const responsavelId = t.responsavelId ? mapaUsuarios.get(String(t.responsavelId)) : null;
      await tx.tarefa.create({
        data: {
          titulo: t.titulo,
          descricao: t.descricao || '',
          prioridade: t.prioridade || 'media',
          status: t.status || 'backlog',
          dataLimite: t.dataLimite ? parseDataAntiga(t.dataLimite) : null,
          responsavelId
        }
      });
      resumo.tarefas++;
    }

    // ─── 10. NOTAS ───────────────────────────────────────
    for (const n of backup.notas || []) {
      await tx.nota.create({ data: { titulo: n.titulo, conteudo: n.conteudo || '', cor: n.cor || '#1e2430' } });
      resumo.notas++;
    }

    // ─── 11. MOVIMENTOS DE ESTOQUE (casados pelo NOME do produto,
    // pois a versão antiga não guardava o ID do produto no movimento) ──
    for (const m of backup.movimentos || []) {
      const produtoId = produtosPorNome.get(m.produto);
      if (!produtoId) {
        resumo.avisos.push(`Movimento de estoque "${m.produto}" não encontrou produto correspondente e foi ignorado.`);
        continue;
      }
      await tx.movimento.create({
        data: {
          produtoId,
          tipo: m.tipo,
          quantidade: Number(m.qtd) || 0,
          motivo: m.motivo || '',
          responsavel: m.responsavel || 'Sistema',
          data: parseDataAntiga(m.data)
        }
      });
      resumo.movimentos++;
    }

    // ─── 12. CONTADORES (continuar a numeração de onde parou) ──
    const maiorPedido = Math.max(0, ...(backup.pedidos || []).map(p => parseInt(p.nro) || 0));
    const maiorOS = Math.max(0, ...(backup.os || []).map(o => parseInt(o.nro) || 0));
    if (maiorPedido > 0) await tx.contador.upsert({ where: { chave: 'pedido' }, create: { chave: 'pedido', valor: maiorPedido }, update: { valor: maiorPedido } });
    if (maiorOS > 0) await tx.contador.upsert({ where: { chave: 'os' }, create: { chave: 'os', valor: maiorOS }, update: { valor: maiorOS } });
  }, { timeout: 60000 });

  console.log('\n✔ Migração concluída:\n');
  console.table(resumo);
  if (resumo.avisos.length > 0) {
    console.log('\n⚠ Avisos:');
    resumo.avisos.forEach(a => console.log('  - ' + a));
  }
}

main()
  .catch((erro) => {
    console.error('\n✘ Erro durante a migração (nada foi salvo, a transação foi revertida):');
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
