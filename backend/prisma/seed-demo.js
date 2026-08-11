// ======================================
// SEED DE DEMONSTRAÇÃO
// ======================================
// Roda com: npm run seed:demo
//
// Diferente do seed.js (que só cria o administrador e é seguro para
// quem clona o repositório), este script APAGA os dados transacionais
// e recria um cenário completo: doze meses de histórico, pedidos em
// todos os status, ordens de serviço, financeiro e estoque coerentes
// entre si.
//
// Por que existe: uma demonstração vazia não mostra nada. Gráfico sem
// série, tabela sem linha e dashboard zerado escondem justamente o que
// o sistema faz. Também é impossível avaliar o layout sem dados reais —
// nome comprido, valor grande e texto que quebra em duas linhas só
// aparecem quando há conteúdo.
//
// Os números respeitam as mesmas invariantes que a API aplica em
// produção (ver services/pedidos.service.js): todo pedido debita
// estoque, registra movimentação e gera lançamento de receita mais o
// custo da mercadoria vendida.

require('dotenv').config();
const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const Dec = Prisma.Decimal;

// ─── SORTEIO DETERMINÍSTICO ─────────────────────────────
// Gerador com semente fixa: rodar o seed duas vezes produz exatamente
// o mesmo cenário. Sem isso, cada execução mudaria os números da
// demonstração e qualquer print viraria mentira.
let semente = 20260811;
function aleatorio() {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
}
const inteiro = (min, max) => Math.floor(aleatorio() * (max - min + 1)) + min;
const escolher = lista => lista[Math.floor(aleatorio() * lista.length)];
const chance = probabilidade => aleatorio() < probabilidade;

function diasAtras(dias, horaBase = 9) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(horaBase + inteiro(0, 8), inteiro(0, 59), 0, 0);
  return d;
}

// ─── DADOS BASE ─────────────────────────────────────────

const NOMES = [
  'Ana Beatriz Ramalho', 'Carlos Eduardo Menezes', 'Fernanda Lopes Vieira',
  'Rafael Aguiar Nunes', 'Juliana Castro Bezerra', 'Marcos Vinícius Tavares',
  'Patrícia Andrade Rocha', 'Thiago Moreira Pacheco', 'Larissa Fontes Cardoso',
  'Bruno Sampaio Queiroz', 'Camila Duarte Figueiredo', 'Eduardo Barros Machado',
  'Renata Siqueira Alves', 'Gustavo Peixoto Lima', 'Mariana Teixeira Coelho',
  'Felipe Antunes Barbosa', 'Vanessa Cordeiro Pinto', 'Rodrigo Salgado Freitas',
  'Priscila Monteiro Braga', 'André Luiz Carvalho', 'Tatiane Ribeiro Gomes',
  'Leonardo Xavier Prado', 'Simone Bastos Correia', 'Diego Fonseca Martins',
  'Aline Guimarães Souto', 'Vitor Hugo Rezende', 'Cristiane Mendonça Lira',
  'Paulo Sérgio Nogueira', 'Débora Cavalcanti Aires', 'Henrique Vasconcelos Sá'
];

const CIDADES = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Curitiba, PR',
  'Porto Alegre, RS', 'Salvador, BA', 'Recife, PE', 'Fortaleza, CE',
  'Campinas, SP', 'Goiânia, GO', 'Florianópolis, SC', 'Vitória, ES'
];

const RUAS = [
  'Rua das Acácias', 'Av. Presidente Vargas', 'Rua Marechal Deodoro',
  'Av. Brasil', 'Rua Sete de Setembro', 'Av. Paulista', 'Rua XV de Novembro',
  'Travessa São João', 'Alameda dos Ipês', 'Rua Dom Pedro II'
];

// Loja de assistência técnica: vende peças e acessórios no e-commerce e
// presta serviço de manutenção pelas ordens de serviço.
const PRODUTOS = [
  ['Teclado Mecânico ABNT2 RGB',       'Periféricos',  289.90, 168.00, 24,  8],
  ['Mouse Óptico 3200 DPI',            'Periféricos',   89.90,  41.50, 46, 12],
  ['Headset Gamer com Microfone',      'Periféricos',  219.00, 128.00, 18,  6],
  ['Mousepad Speed 90x40cm',           'Periféricos',   59.90,  24.00, 52, 15],
  ['Webcam Full HD 1080p',             'Periféricos',  199.90, 112.00, 13,  5],
  ['SSD SATA 480GB',                   'Armazenamento', 249.90, 158.00, 31, 10],
  ['SSD NVMe 1TB',                     'Armazenamento', 529.90, 372.00, 12,  4],
  ['HD Externo 2TB USB 3.0',           'Armazenamento', 449.00, 298.00,  9,  4],
  ['Pen Drive 128GB USB 3.1',          'Armazenamento',  79.90,  38.00, 64, 20],
  ['Cartão MicroSD 256GB Classe 10',   'Armazenamento', 169.90,  94.00, 27,  8],
  ['Memória DDR4 8GB 3200MHz',         'Componentes',   189.90, 118.00, 22,  8],
  ['Memória DDR4 16GB 3200MHz',        'Componentes',   349.90, 231.00, 15,  5],
  ['Fonte ATX 550W 80 Plus Bronze',    'Componentes',   329.90, 214.00, 11,  4],
  ['Cooler para Processador 120mm',    'Componentes',   139.90,  76.00, 19,  6],
  ['Pasta Térmica 4g',                 'Componentes',    34.90,  12.50, 88, 25],
  ['Placa de Rede Wi-Fi PCIe',         'Componentes',   159.90,  92.00,  7,  5],
  ['Cabo HDMI 2.0 2 metros',           'Cabos',          44.90,  16.00, 73, 20],
  ['Cabo de Rede Cat6 5 metros',       'Cabos',          39.90,  14.50, 61, 20],
  ['Adaptador USB-C para HDMI',        'Cabos',         119.90,  62.00, 26,  8],
  ['Hub USB 3.0 4 Portas',             'Cabos',          89.90,  43.00, 34, 10],
  ['Cabo de Força Tripolar 1,5m',      'Cabos',          24.90,   8.90, 95, 30],
  ['Nobreak 700VA Bivolt',             'Energia',       679.00, 468.00,  6,  3],
  ['Estabilizador 500VA',              'Energia',       249.90, 156.00, 14,  5],
  ['Filtro de Linha 6 Tomadas',        'Energia',        69.90,  28.00, 41, 12],
  ['Bateria Selada 12V 7Ah',           'Energia',       189.90, 112.00,  8,  4],
  ['Monitor LED 24" Full HD',          'Monitores',     849.00, 612.00,  9,  3],
  ['Monitor LED 27" 144Hz',            'Monitores',    1499.00, 1104.00, 4,  2],
  ['Suporte Articulado para Monitor',  'Monitores',     229.90, 128.00, 17,  6],
  ['Tela Notebook 15.6" LED',          'Peças',         489.00, 322.00, 10,  4],
  ['Teclado Interno Notebook',         'Peças',         189.90, 104.00, 16,  6],
  ['Bateria Notebook 4 Células',       'Peças',         349.00, 218.00,  7,  4],
  ['Carregador Universal 90W',         'Peças',         159.90,  84.00, 23,  8],
  ['Dobradiça Notebook (par)',         'Peças',          79.90,  32.00, 12,  6],
  ['Kit Chaves de Precisão 32 peças',  'Ferramentas',   129.90,  58.00, 20,  6],
  ['Estação de Solda 60W',             'Ferramentas',   379.00, 246.00,  5,  3],
  ['Multímetro Digital',               'Ferramentas',   149.90,  78.00, 13,  5],
  ['Pulseira Antiestática',            'Ferramentas',    29.90,   9.90, 47, 15],
  ['Ar Comprimido Limpeza 300ml',      'Ferramentas',    44.90,  18.00, 55, 18],
  ['Suporte Notebook Alumínio',        'Acessórios',    179.90,  96.00, 21,  8],
  ['Base Cooler para Notebook',        'Acessórios',    129.90,  64.00, 18,  6]
];

const FORNECEDORES = [
  ['Nexus Distribuidora de Informática', 'Rogério Palma',    '(11) 3255-4180', 'comercial@nexusdist.com.br', '12.345.678/0001-90', 'Componentes'],
  ['TecPeças Importação Ltda',           'Marta Bandeira',   '(11) 4002-8922', 'vendas@tecpecas.com.br',    '23.456.789/0001-01', 'Peças'],
  ['CabosBrasil Comércio',               'Sérgio Toledo',    '(41) 3322-7766', 'sac@cabosbrasil.com.br',    '34.567.890/0001-12', 'Cabos'],
  ['EnergiaMax Equipamentos',            'Luciana Ferraz',   '(21) 2588-3410', 'contato@energiamax.com.br', '45.678.901/0001-23', 'Energia'],
  ['DisplayTech Monitores',              'Anderson Klein',   '(48) 3025-1199', 'parceiros@displaytech.com', '56.789.012/0001-34', 'Monitores'],
  ['FerramentaPro Suprimentos',          'Ivone Delgado',    '(31) 3444-2020', 'pedidos@ferramentapro.com', '67.890.123/0001-45', 'Ferramentas']
];

const SERVICOS_OS = [
  ['Formatação e reinstalação do sistema',   'Backup dos arquivos, formatação e reinstalação com drivers atualizados.', 180.00],
  ['Troca de tela de notebook',              'Substituição da tela danificada e teste de imagem.',                       620.00],
  ['Limpeza interna e troca de pasta térmica','Desmontagem completa, limpeza dos coolers e troca da pasta térmica.',     150.00],
  ['Upgrade de memória e SSD',               'Instalação de módulo de memória e clonagem do sistema para SSD.',          240.00],
  ['Recuperação de dados de HD',             'Tentativa de recuperação em disco com setores defeituosos.',               450.00],
  ['Substituição de bateria de notebook',    'Troca da bateria e calibração de carga.',                                  290.00],
  ['Manutenção preventiva em desktop',       'Limpeza, revisão de cabos, teste de fonte e atualização de BIOS.',         160.00],
  ['Reparo de conector de energia',          'Solda do conector de alimentação na placa-mãe.',                           380.00],
  ['Instalação de rede e configuração',      'Passagem de cabo, crimpagem e configuração do roteador.',                  320.00],
  ['Remoção de vírus e otimização',          'Varredura completa, remoção de malware e otimização de inicialização.',     140.00],
  ['Troca de teclado de notebook',           'Substituição do teclado interno e teste de todas as teclas.',              260.00],
  ['Diagnóstico técnico completo',           'Avaliação de hardware e software com laudo por escrito.',                   90.00]
];

const TAREFAS = [
  ['Cotar fornecedor de SSD NVMe',       'Comparar preço com Nexus e TecPeças antes do próximo pedido.', 'alta',  'backlog'],
  ['Revisar tabela de preços das peças', 'Margem de tela de notebook está abaixo do alvo.',              'media', 'backlog'],
  ['Fotografar produtos novos',          'Fotos de fundo branco para a vitrine da loja.',                'baixa', 'backlog'],
  ['Organizar bancada de solda',         'Separar ferramentas por tipo e repor estanho.',                'baixa', 'backlog'],
  ['Negociar prazo com CabosBrasil',     'Tentar 30/60 dias no lugar de à vista.',                       'alta',  'andamento'],
  ['Montar kit de manutenção preventiva','Definir itens e preço do pacote mensal para empresas.',        'media', 'andamento'],
  ['Treinar equipe no novo sistema',     'Sessão de 1h cobrindo pedidos e ordens de serviço.',           'media', 'andamento'],
  ['Conferir inventário de periféricos', 'Contagem física comparada com o estoque do sistema.',          'alta',  'revisao'],
  ['Revisar textos da loja virtual',     'Descrições curtas demais em Cabos e Energia.',                 'baixa', 'revisao'],
  ['Emitir notas do mês',                'Todas as O.S. concluídas em setembro.',                        'alta',  'concluido'],
  ['Atualizar cadastro de fornecedores', 'Telefones e contatos conferidos por telefone.',                'media', 'concluido'],
  ['Backup do banco de dados',           'Rotina semanal configurada e testada.',                        'alta',  'concluido']
];

const EVENTOS = [
  ['Entrega do nobreak — Cliente Corporativo', 'compromisso', -12],
  ['Visita técnica no escritório do cliente',  'compromisso',  -6],
  ['Reunião com fornecedor Nexus',             'reuniao',      -3],
  ['Fechamento do caixa mensal',               'tarefa',       -1],
  ['Manutenção preventiva agendada',           'compromisso',   2],
  ['Reunião de equipe — metas do mês',         'reuniao',       4],
  ['Entrega de 3 notebooks reparados',         'compromisso',   6],
  ['Treinamento de atendimento',               'reuniao',       9],
  ['Inventário trimestral',                    'tarefa',       15],
  ['Renovação do contrato de internet',        'tarefa',        22]
];

const NOTAS = [
  ['Senha do roteador da bancada', 'Rede TEC-BANCADA — a senha fica no armário da chave, envelope azul.', '#1e2430'],
  ['Contato do contador',          'Escritório Lima & Associados — (11) 3030-4040, falar com Sandra.',    '#2a2035'],
  ['Garantia dos SSDs',            'Nexus dá 3 anos, TecPeças só 1 ano. Preferir Nexus mesmo custando mais.', '#1e2a30'],
  ['Clientes que pedem NF sempre', 'Ana Beatriz, Eduardo Barros e Priscila Monteiro.',                    '#302020'],
  ['Ideia: pacote manutenção',     'Plano mensal para empresas: 2 visitas + suporte remoto. Estudar preço.', '#25302a']
];

// Calibradas contra o volume de vendas gerado abaixo: o custo fixo
// precisa caber na margem, senão a demonstração exibe uma empresa no
// prejuízo e o saldo do financeiro fica negativo em todos os meses.
const DESPESAS_FIXAS = [
  ['Aluguel da loja',            'Instalações',  2400.00],
  ['Energia elétrica',           'Utilidades',    380.00],
  ['Internet e telefonia',       'Utilidades',    210.00],
  ['Salários e encargos',        'Pessoal',      2600.00],
  ['Contador',                   'Serviços',      380.00],
  ['Material de escritório',     'Operacional',   120.00]
];

// ─── LIMPEZA ────────────────────────────────────────────
// Ordem inversa das dependências: filhos antes dos pais.
async function limpar() {
  await prisma.lancamento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.movimento.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.ordemServico.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.fornecedor.deleteMany();
  await prisma.evento.deleteMany();
  await prisma.nota.deleteMany();
  await prisma.logAcao.deleteMany();
  await prisma.contador.deleteMany();
  // Usuários: preserva o administrador, remove os demais.
  await prisma.usuario.deleteMany({ where: { perfil: { not: 'Administrador' } } });
}

async function main() {
  console.log('Limpando dados anteriores...');
  await limpar();

  // ─── USUÁRIOS ─────────────────────────────────────────
  const admin = process.env.SEED_ADMIN_USUARIO || 'admin';
  const senhaPadrao = await bcrypt.hash('demo123', 10);

  const adminExistente = await prisma.usuario.findUnique({ where: { usuario: admin } });
  if (!adminExistente) {
    await prisma.usuario.create({
      data: {
        nome: process.env.SEED_ADMIN_NOME || 'Administrador',
        usuario: admin,
        senhaHash: await bcrypt.hash(process.env.SEED_ADMIN_SENHA || 'admin123', 10),
        perfil: 'Administrador'
      }
    });
  }

  // Perfis diferentes para demonstrar o controle de acesso.
  await prisma.usuario.createMany({
    data: [
      { nome: 'Marcelo Tavares',  usuario: 'marcelo',  senhaHash: senhaPadrao, perfil: 'Operador' },
      { nome: 'Juliana Prado',    usuario: 'juliana',  senhaHash: senhaPadrao, perfil: 'Operador' },
      { nome: 'Auditor Externo',  usuario: 'auditor',  senhaHash: senhaPadrao, perfil: 'Visitante' },
      { nome: 'Renato Lisboa',    usuario: 'renato',   senhaHash: senhaPadrao, perfil: 'Operador', ativo: false }
    ]
  });
  const usuarios = await prisma.usuario.findMany({ where: { ativo: true } });
  console.log(`✔ ${usuarios.length} usuários`);

  // ─── FORNECEDORES ─────────────────────────────────────
  await prisma.fornecedor.createMany({
    data: FORNECEDORES.map(([empresa, contato, telefone, email, cnpj, categoria]) => ({
      empresa, contato, telefone, email, cnpj, categoria
    }))
  });
  console.log(`✔ ${FORNECEDORES.length} fornecedores`);

  // ─── PRODUTOS ─────────────────────────────────────────
  await prisma.produto.createMany({
    data: PRODUTOS.map(([nome, categoria, preco, custo, estoque, estoqueMin], i) => ({
      nome,
      codigo: `${categoria.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      categoria,
      preco: new Dec(preco.toFixed(2)),
      custo: new Dec(custo.toFixed(2)),
      estoque,
      estoqueMin,
      descricao: `${nome}. Produto testado e com garantia de 12 meses.`,
      ativo: true,
      criadoEm: diasAtras(inteiro(5, 300))
    }))
  });
  const produtos = await prisma.produto.findMany();
  console.log(`✔ ${produtos.length} produtos`);

  // ─── CLIENTES ─────────────────────────────────────────
  const senhaCliente = await bcrypt.hash('cliente123', 10);
  await prisma.cliente.createMany({
    data: NOMES.map((nome, i) => {
      const primeiro = nome.split(' ')[0].toLowerCase();
      const temConta = i % 3 !== 0; // dois terços criaram login na loja
      return {
        nome,
        email: `${primeiro}.${nome.split(' ').pop().toLowerCase()}@email.com`,
        telefone: `(${inteiro(11, 85)}) 9${inteiro(1000, 9999)}-${inteiro(1000, 9999)}`,
        cpf: `${inteiro(100, 999)}.${inteiro(100, 999)}.${inteiro(100, 999)}-${inteiro(10, 99)}`,
        endereco: `${escolher(RUAS)}, ${inteiro(10, 1990)} — ${escolher(CIDADES)}`,
        status: i % 11 === 0 ? 'inadimplente' : (i % 7 === 0 ? 'inativo' : 'ativo'),
        senhaHash: temConta ? senhaCliente : null,
        origem: temConta ? 'loja' : 'manual',
        criadoEm: diasAtras(inteiro(10, 360))
      };
    })
  });
  const clientes = await prisma.cliente.findMany();
  console.log(`✔ ${clientes.length} clientes`);

  // ─── PEDIDOS ──────────────────────────────────────────
  // Volume crescente ao longo do ano, para o gráfico mostrar tendência
  // em vez de uma linha reta.
  const itens = [];
  const movimentos = [];
  const lancamentos = [];
  let numeroPedido = 0;

  for (let mesAtras = 11; mesAtras >= 0; mesAtras--) {
    // Volume crescente: 14 pedidos no mês mais antigo, ~25 no atual.
    const base = 14 + Math.round((11 - mesAtras) * 1.0);
    const pedidosNoMes = base + inteiro(0, 3);

    for (let k = 0; k < pedidosNoMes; k++) {
      const dias = mesAtras * 30 + inteiro(0, 29);
      const data = diasAtras(dias);
      const cliente = escolher(clientes);

      // Prazos de uma loja real: a maioria entrega em menos de duas
      // semanas. Prazos longos demais empurrariam a receita para
      // "pendente" nos meses recentes enquanto o custo já sai como
      // pago, e o gráfico mostraria os últimos meses no vermelho.
      // Alguns cancelados para a tela não parecer artificial.
      let status;
      if (chance(0.06)) status = 'cancelado';
      else if (dias > 12) status = 'entregue';
      else if (dias > 5) status = escolher(['entregue', 'entregue', 'entregue', 'enviado']);
      else if (dias > 2) status = escolher(['entregue', 'entregue', 'enviado', 'processando']);
      else status = escolher(['pendente', 'processando', 'enviado']);

      numeroPedido += 1;
      const numero = String(numeroPedido).padStart(4, '0');

      const qtdItens = inteiro(1, 4);
      const escolhidos = [];
      for (let j = 0; j < qtdItens; j++) {
        const p = escolher(produtos);
        if (!escolhidos.find(e => e.id === p.id)) escolhidos.push(p);
      }

      let total = new Dec(0);
      let custoTotal = new Dec(0);
      const itensDoPedido = escolhidos.map(p => {
        const quantidade = inteiro(1, 3);
        const subtotal = new Dec(p.preco).mul(quantidade);
        total = total.add(subtotal);
        custoTotal = custoTotal.add(new Dec(p.custo).mul(quantidade));
        return { produtoId: p.id, nome: p.nome, precoUnitario: new Dec(p.preco), quantidade, subtotal };
      });

      const pagamento = escolher(['cartao', 'pix', 'pix', 'boleto']);
      const pedido = await prisma.pedido.create({
        data: {
          numero,
          clienteId: cliente.id,
          enderecoEntrega: cliente.endereco,
          total,
          pagamento,
          parcelas: pagamento === 'cartao' ? escolher([1, 1, 2, 3, 6]) : 1,
          status,
          data
        }
      });

      for (const item of itensDoPedido) {
        itens.push({ ...item, pedidoId: pedido.id });
        movimentos.push({
          produtoId: item.produtoId,
          tipo: 'saida',
          quantidade: item.quantidade,
          motivo: `Pedido #${numero}`,
          responsavel: 'Loja',
          data
        });
      }

      // Pedido cancelado é estornado: não gera receita nem custo.
      if (status !== 'cancelado') {
        lancamentos.push({
          descricao: `Venda — Pedido #${numero} (${cliente.nome})`,
          categoria: 'Venda de produtos',
          tipo: 'receita',
          valor: total,
          status: status === 'entregue' ? 'pago' : 'pendente',
          pedidoId: pedido.id,
          data
        });
        if (custoTotal.gt(0)) {
          lancamentos.push({
            descricao: `CMV — Pedido #${numero}`,
            categoria: 'Custo de mercadoria',
            tipo: 'despesa',
            valor: custoTotal,
            status: 'pago',
            pedidoId: pedido.id,
            data
          });
        }
      }
    }
  }

  await prisma.itemPedido.createMany({ data: itens });
  await prisma.movimento.createMany({ data: movimentos });
  console.log(`✔ ${numeroPedido} pedidos com ${itens.length} itens`);

  // ─── ORDENS DE SERVIÇO ────────────────────────────────
  let numeroOS = 0;
  for (let mesAtras = 11; mesAtras >= 0; mesAtras--) {
    const osNoMes = inteiro(2, 5);
    for (let k = 0; k < osNoMes; k++) {
      const dias = mesAtras * 30 + inteiro(0, 29);
      const abertura = diasAtras(dias);
      const [titulo, descricao, valorBase] = escolher(SERVICOS_OS);
      const cliente = escolher(clientes);
      const responsavel = escolher(usuarios);

      let status;
      if (chance(0.06)) status = 'cancelada';
      else if (dias > 30) status = 'concluida';
      else if (dias > 10) status = escolher(['concluida', 'andamento']);
      else status = escolher(['aberta', 'aberta', 'andamento']);

      const valor = new Dec((valorBase * (0.9 + aleatorio() * 0.3)).toFixed(2));
      numeroOS += 1;
      const numero = String(numeroOS).padStart(4, '0');

      const os = await prisma.ordemServico.create({
        data: {
          numero,
          titulo,
          descricao,
          observacao: chance(0.3) ? 'Cliente autorizou o orçamento por WhatsApp.' : null,
          status,
          prioridade: escolher(['baixa', 'normal', 'normal', 'alta', 'urgente']),
          valor,
          clienteId: cliente.id,
          responsavelId: responsavel.id,
          dataAbertura: abertura,
          dataConclusao: status === 'concluida' ? new Date(abertura.getTime() + inteiro(1, 6) * 86400000) : null
        }
      });

      if (status === 'concluida') {
        lancamentos.push({
          descricao: `O.S. #${numero} — ${titulo}`,
          categoria: 'Serviço prestado',
          tipo: 'receita',
          valor,
          status: 'pago',
          osId: os.id,
          data: os.dataConclusao
        });
      }
    }
  }
  console.log(`✔ ${numeroOS} ordens de serviço`);

  // ─── DESPESAS FIXAS MENSAIS ───────────────────────────
  // Sem elas o financeiro só teria receita, e o saldo não faria sentido.
  for (let mesAtras = 11; mesAtras >= 0; mesAtras--) {
    for (const [descricao, categoria, valor] of DESPESAS_FIXAS) {
      const data = diasAtras(mesAtras * 30 + 5, 8);
      lancamentos.push({
        descricao: `${descricao} — ${data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        categoria,
        tipo: 'despesa',
        valor: new Dec((valor * (0.97 + aleatorio() * 0.06)).toFixed(2)),
        status: mesAtras === 0 ? escolher(['pago', 'pendente']) : 'pago',
        data
      });
    }
  }

  await prisma.lancamento.createMany({ data: lancamentos });
  console.log(`✔ ${lancamentos.length} lançamentos financeiros`);

  // ─── TAREFAS, AGENDA E NOTAS ──────────────────────────
  await prisma.tarefa.createMany({
    data: TAREFAS.map(([titulo, descricao, prioridade, status]) => ({
      titulo, descricao, prioridade, status,
      responsavelId: escolher(usuarios).id,
      dataLimite: diasAtras(-inteiro(1, 25))
    }))
  });
  console.log(`✔ ${TAREFAS.length} tarefas`);

  await prisma.evento.createMany({
    data: EVENTOS.map(([titulo, tipo, deslocamento]) => ({
      titulo,
      tipo,
      data: diasAtras(-deslocamento),
      hora: `${String(inteiro(8, 17)).padStart(2, '0')}:${escolher(['00', '30'])}`,
      descricao: null
    }))
  });
  console.log(`✔ ${EVENTOS.length} eventos na agenda`);

  await prisma.nota.createMany({
    data: NOTAS.map(([titulo, conteudo, cor]) => ({
      titulo, conteudo, cor, criadoEm: diasAtras(inteiro(1, 90))
    }))
  });
  console.log(`✔ ${NOTAS.length} notas`);

  // ─── AJUSTE DE ESTOQUE ────────────────────────────────
  // O estoque declarado em PRODUTOS é o valor final desejado na
  // vitrine. Como os pedidos acima "saíram" desse estoque, somamos as
  // saídas de volta para que a quantidade exibida bata com a lista —
  // e para que continue havendo produto disponível para comprar na
  // demonstração.
  const saidasPorProduto = {};
  for (const m of movimentos) {
    saidasPorProduto[m.produtoId] = (saidasPorProduto[m.produtoId] || 0) + m.quantidade;
  }
  for (const [produtoId, saida] of Object.entries(saidasPorProduto)) {
    await prisma.produto.update({
      where: { id: Number(produtoId) },
      data: { estoque: { increment: saida } }
    });
  }

  // Deixa alguns produtos em estado crítico de propósito: o painel tem
  // alerta de estoque baixo e ele precisa ter o que mostrar.
  const paraZerar = produtos.slice(0, 2).map(p => p.id);
  const paraCritico = produtos.slice(2, 6).map(p => p.id);
  await prisma.produto.updateMany({ where: { id: { in: paraZerar } }, data: { estoque: 0 } });
  for (const id of paraCritico) {
    const p = produtos.find(x => x.id === id);
    await prisma.produto.update({ where: { id }, data: { estoque: Math.max(1, p.estoqueMin - 2) } });
  }

  // ─── CONTADORES ───────────────────────────────────────
  // Sem isto, o próximo pedido criado pela loja receberia o número
  // #0001 e colidiria com o histórico (a coluna é única).
  await prisma.contador.createMany({
    data: [
      { chave: 'pedido', valor: numeroPedido },
      { chave: 'os', valor: numeroOS }
    ]
  });

  // ─── RESUMO ───────────────────────────────────────────
  const receita = await prisma.lancamento.aggregate({
    where: { tipo: 'receita', status: 'pago' }, _sum: { valor: true }
  });
  const despesa = await prisma.lancamento.aggregate({
    where: { tipo: 'despesa', status: 'pago' }, _sum: { valor: true }
  });

  const moeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalReceita = new Dec(receita._sum.valor || 0);
  const totalDespesa = new Dec(despesa._sum.valor || 0);

  console.log('\n─── Cenário criado ───');
  console.log(`  Receita (paga):   ${moeda(totalReceita)}`);
  console.log(`  Despesa (paga):   ${moeda(totalDespesa)}`);
  console.log(`  Resultado:        ${moeda(totalReceita.sub(totalDespesa))}`);
  console.log(`  Contadores: pedido=${numeroPedido}, os=${numeroOS}`);

  // Confere mês a mês: um único mês no vermelho já apareceria como
  // barra negativa no gráfico do painel.
  const todos = await prisma.lancamento.findMany({ select: { tipo: true, valor: true, data: true, status: true } });
  const porMes = {};
  for (const l of todos) {
    if (l.status !== 'pago') continue;
    const chave = `${l.data.getFullYear()}-${String(l.data.getMonth() + 1).padStart(2, '0')}`;
    if (!porMes[chave]) porMes[chave] = { receita: new Dec(0), despesa: new Dec(0) };
    porMes[chave][l.tipo] = porMes[chave][l.tipo].add(new Dec(l.valor));
  }
  const meses = Object.keys(porMes).sort();
  const negativos = meses.filter(m => porMes[m].receita.sub(porMes[m].despesa).lt(0));
  console.log(`\n  Meses com histórico: ${meses.length} | no vermelho: ${negativos.length}`);
  if (negativos.length) console.log(`  Atenção — meses negativos: ${negativos.join(', ')}`);
  console.log('\n  Acessos de demonstração:');
  console.log(`    ${admin} / ${process.env.SEED_ADMIN_SENHA || 'admin123'}  (Administrador)`);
  console.log('    marcelo / demo123                (Operador)');
  console.log('    auditor / demo123                (Visitante — só leitura)');
  console.log('    Loja: qualquer e-mail da lista de clientes / cliente123');
  console.log('\nSeed de demonstração concluído.');
}

main()
  .catch((erro) => {
    console.error('Erro ao rodar o seed de demonstração:', erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
