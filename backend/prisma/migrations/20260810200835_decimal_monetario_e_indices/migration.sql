-- Valores monetarios passam de DOUBLE PRECISION para DECIMAL(12,2).
-- Ponto flutuante nao representa decimais exatamente: somas de muitas
-- linhas acumulavam diferenca de centavos nos relatorios.
--
-- Tambem cria os indices que faltavam. O PostgreSQL indexa chave
-- primaria e colunas UNIQUE automaticamente, mas nao chaves
-- estrangeiras: sem estes, todo JOIN varria a tabela inteira.
-- AlterTable
ALTER TABLE "itens_pedido" ALTER COLUMN "precoUnitario" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "lancamentos_financeiros" ALTER COLUMN "valor" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ordens_servico" ALTER COLUMN "valor" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "pedidos" ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "produtos" ALTER COLUMN "preco" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "custo" SET DATA TYPE DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE INDEX "clientes_status_idx" ON "clientes"("status");

-- CreateIndex
CREATE INDEX "eventos_data_idx" ON "eventos"("data");

-- CreateIndex
CREATE INDEX "itens_pedido_pedidoId_idx" ON "itens_pedido"("pedidoId");

-- CreateIndex
CREATE INDEX "itens_pedido_produtoId_idx" ON "itens_pedido"("produtoId");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_pedidoId_idx" ON "lancamentos_financeiros"("pedidoId");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_osId_idx" ON "lancamentos_financeiros"("osId");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_data_idx" ON "lancamentos_financeiros"("data");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_tipo_status_idx" ON "lancamentos_financeiros"("tipo", "status");

-- CreateIndex
CREATE INDEX "log_acoes_data_idx" ON "log_acoes"("data");

-- CreateIndex
CREATE INDEX "movimentos_estoque_produtoId_data_idx" ON "movimentos_estoque"("produtoId", "data");

-- CreateIndex
CREATE INDEX "ordens_servico_clienteId_idx" ON "ordens_servico"("clienteId");

-- CreateIndex
CREATE INDEX "ordens_servico_responsavelId_idx" ON "ordens_servico"("responsavelId");

-- CreateIndex
CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");

-- CreateIndex
CREATE INDEX "ordens_servico_dataAbertura_idx" ON "ordens_servico"("dataAbertura");

-- CreateIndex
CREATE INDEX "pedidos_clienteId_idx" ON "pedidos"("clienteId");

-- CreateIndex
CREATE INDEX "pedidos_status_idx" ON "pedidos"("status");

-- CreateIndex
CREATE INDEX "pedidos_data_idx" ON "pedidos"("data");

-- CreateIndex
CREATE INDEX "produtos_nome_idx" ON "produtos"("nome");

-- CreateIndex
CREATE INDEX "produtos_categoria_idx" ON "produtos"("categoria");

-- CreateIndex
CREATE INDEX "produtos_ativo_estoque_idx" ON "produtos"("ativo", "estoque");

-- CreateIndex
CREATE INDEX "tarefas_responsavelId_idx" ON "tarefas"("responsavelId");

-- CreateIndex
CREATE INDEX "tarefas_status_idx" ON "tarefas"("status");
