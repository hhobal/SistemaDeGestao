-- CreateTable
CREATE TABLE "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL DEFAULT 'Operador',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cpf" TEXT,
    "endereco" TEXT,
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "senhaHash" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "empresa" TEXT NOT NULL,
    "contato" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cnpj" TEXT,
    "categoria" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "categoria" TEXT,
    "preco" REAL NOT NULL DEFAULT 0,
    "custo" REAL NOT NULL DEFAULT 0,
    "estoque" INTEGER NOT NULL DEFAULT 0,
    "estoqueMin" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "enderecoEntrega" TEXT,
    "total" REAL NOT NULL DEFAULT 0,
    "pagamento" TEXT NOT NULL,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedidoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "precoUnitario" REAL NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "itens_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "itens_pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberta',
    "prioridade" TEXT NOT NULL DEFAULT 'normal',
    "valor" REAL NOT NULL DEFAULT 0,
    "clienteId" INTEGER,
    "responsavelId" INTEGER,
    "dataAbertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" DATETIME,
    CONSTRAINT "ordens_servico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ordens_servico_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movimentos_estoque" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "produtoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT,
    "responsavel" TEXT,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimentos_estoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "tipo" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" INTEGER,
    "osId" INTEGER,
    CONSTRAINT "lancamentos_financeiros_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "lancamentos_financeiros_osId_fkey" FOREIGN KEY ("osId") REFERENCES "ordens_servico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "hora" TEXT,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'outro'
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'backlog',
    "dataLimite" DATETIME,
    "responsavelId" INTEGER,
    CONSTRAINT "tarefas_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT,
    "cor" TEXT DEFAULT '#1e2430',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "log_acoes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario" TEXT,
    "acao" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "detalhe" TEXT
);

-- CreateTable
CREATE TABLE "contadores" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "valor" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "produtos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_key" ON "pedidos"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");
