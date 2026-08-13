# GESTIQ — Backend (API REST)

Backend em Node.js + Express + Prisma para o Sistema de Gestão (painel
administrativo + loja virtual). Substitui o `localStorage` por um banco
de dados de verdade, com autenticação segura e as regras de negócio
centralizadas no servidor.

## Por que essas escolhas técnicas

- **Node.js** — mesma linguagem do front-end, sem context-switch.
- **SQLite em desenvolvimento, PostgreSQL em produção** — o Prisma (ORM)
  abstrai o banco: o código é idêntico nos dois, só muda a variável
  `DATABASE_URL` no `.env`. Comece testando sem instalar nada além do
  Node; quando for para o servidor Linux da empresa, troque para
  PostgreSQL sem reescrever uma linha de lógica.
- **JWT** para autenticação — sem sessão guardada no servidor, fácil de
  escalar para mais de um processo/servidor no futuro.
- **bcrypt** para senha — nunca mais texto puro no banco.

---

## 1. Instalação

Pré-requisito: [Node.js](https://nodejs.org) 18 ou superior instalado.

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `.env` e troque pelo menos `JWT_SECRET` e `JWT_LOJA_SECRET` por
valores aleatórios. Para gerar um:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 2. Criar o banco de dados (primeira vez)

```bash
npx prisma migrate dev --name inicial
```

Isso cria o arquivo `prisma/dev.db` (SQLite) com todas as tabelas.

## 3. Criar o usuário administrador inicial

```bash
npm run seed
```

Por padrão cria o usuário `admin` / senha `admin123` (definidos no
`.env` em `SEED_ADMIN_USUARIO` / `SEED_ADMIN_SENHA` — **troque a senha
no `.env` antes de rodar o seed em produção**). Também cria alguns
produtos e um fornecedor de exemplo, só para você já abrir o sistema
com algo na tela.

## 4. Rodar o servidor

```bash
npm run dev
```

A API sobe em `http://localhost:3001`. Teste rápido:

```bash
curl http://localhost:3001/api/saude
```

### Abrindo a interface

A interface fica em `../web/` e roda com o servidor de desenvolvimento
do Vite:

```bash
npm run dev --prefix web      # a partir da raiz do projeto
```

O `vite.config.ts` encaminha `/api` para `localhost:3001`, então o
navegador vê tudo na mesma origem e não há CORS em desenvolvimento.
Se preferir apontar direto para esta API, crie um `web/.env.local` com
`VITE_API_URL` — e nesse caso o endereço precisa constar em
`CORS_ORIGINS` no `.env` daqui, senão o navegador bloqueia as
requisições.

---

## Migrando os dados do sistema antigo (localStorage)

1. No sistema **antigo**, clique em "Exportar dados" → baixa um
   `backup-erp-AAAA-MM-DD.json`.
2. *(Opcional, mas recomendado)* Os clientes que criaram conta na loja
   ficam numa chave separada do navegador, que o botão de exportar não
   inclui. Para trazer essas contas (com senha): abra o Console do
   navegador (F12) na página da loja antiga e rode:
   ```js
   copy(localStorage.getItem('loja_clientes'))
   ```
   Cole o conteúdo num arquivo `loja-clientes.json`.
3. Rode a migração:
   ```bash
   node scripts/migrar-localstorage.js caminho/backup-erp-2026-06-20.json caminho/loja-clientes.json
   ```
   O segundo arquivo é opcional — sem ele, clientes que já fizeram
   pedidos ainda são recuperados (o nome/e-mail fica salvo dentro de
   cada pedido), só não vêm com senha definida (eles podem usar
   "esqueci minha senha" — funcionalidade a implementar, ver seção de
   próximos passos).

O script roda tudo dentro de uma única transação: se algo der errado no
meio, nada é gravado. No final ele imprime um resumo com a contagem de
cada tabela e avisos sobre qualquer referência que não foi possível
casar (ex.: um movimento de estoque mencionando um produto que já
tinha sido excluído).

---

## Visão geral da API

Todas as rotas (exceto as marcadas como públicas) exigem o cabeçalho:
```
Authorization: Bearer <token>
```

### Autenticação — equipe interna
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | `{ usuario, senha }` → `{ token, usuario }` |
| GET | `/api/auth/me` | Dados do usuário logado |
| PUT | `/api/auth/me` | Atualizar nome / trocar senha |

### Cadastros
`/api/clientes`, `/api/fornecedores`, `/api/produtos`, `/api/usuarios`
(este último só para Administrador) — todos seguem o mesmo padrão REST:
`GET /` (lista paginada, aceita `?busca=&pagina=&porPagina=`),
`GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`.

### Pedidos (painel)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/pedidos` | Lista com filtro `?status=&busca=` |
| GET | `/api/pedidos/resumo` | Cards (pendentes, processando, enviados, faturado) |
| GET | `/api/pedidos/:id` | Detalhe com custo e lucro bruto |
| PATCH | `/api/pedidos/:id/status` | `{ status }` — debita/devolve estoque e ajusta financeiro automaticamente |
| DELETE | `/api/pedidos/:id` | Só permite excluir pedidos já cancelados |

### Ordens de Serviço
Mesmo padrão de `/api/pedidos`, em `/api/os`. Concluir uma O.S. com
`PATCH /api/os/:id/status` lança a receita automaticamente em Finanças
(correção do bug do sistema antigo).

### Estoque
| Método | Rota |
|---|---|
| GET | `/api/estoque/resumo` |
| GET | `/api/estoque/criticos` |
| GET | `/api/estoque/movimentos` |
| POST | `/api/estoque/movimentos` — `{ produtoId, tipo, quantidade, motivo }` |

### Finanças
| Método | Rota |
|---|---|
| GET | `/api/financas/resumo?tipo=&status=&busca=` | Cards SEMPRE respeitando os mesmos filtros da lista |
| GET | `/api/financas/mensal` | Série para o gráfico |
| GET/POST/PUT/DELETE | `/api/financas/lancamentos` |
| PATCH | `/api/financas/lancamentos/:id/status` |

### Agenda, Tarefas, Notas
CRUD simples — ver `src/routes/*.routes.js`.

### Dashboard e Relatórios
| Método | Rota |
|---|---|
| GET | `/api/dashboard` | Tudo que o dashboard precisa, numa chamada só |
| GET | `/api/relatorios/faturamento-mensal` |
| GET | `/api/relatorios/top-clientes` |
| GET | `/api/relatorios/status-os` |
| GET | `/api/relatorios/produtos-mais-vendidos` |

### Backup
| Método | Rota |
|---|---|
| GET | `/api/backup` | Exporta tudo em JSON (Administrador) |
| POST | `/api/backup/importar` | Reimporta clientes/fornecedores/produtos |

### Loja virtual (cliente final) — `/api/loja/...`
| Método | Rota | Auth |
|---|---|---|
| GET | `/loja/produtos` | Pública — só itens ativos, com preço e em estoque |
| POST | `/loja/auth/registrar` | Pública |
| POST | `/loja/auth/login` | Pública |
| GET | `/loja/auth/me` | Cliente |
| POST | `/loja/pedidos` | Cliente — cria pedido a partir do carrinho |
| GET | `/loja/pedidos` | Cliente — meus pedidos |

---

## O que mudou em relação à versão `localStorage` (resumo das correções)

1. **Senhas com hash (bcrypt)** em vez de texto puro.
2. **Login validado pelo servidor** (JWT) em vez de uma chave qualquer no navegador.
3. **Estoque reservado na criação do pedido**, não só quando vira "entregue" — evita vender a última unidade duas vezes para clientes diferentes.
4. **O.S. concluída agora lança receita em Finanças automaticamente.**
5. **Cards de Finanças sempre respeitam o filtro ativo** (tipo/status/busca).
6. **Faturamento, gráfico mensal e ranking de clientes agora somam Pedidos + O.S.**, não só O.S.
7. **Clientes do ERP e da Loja unificados numa única tabela** (antes existiam duas listas que precisavam ser sincronizadas manualmente).
8. **Numeração de Pedidos/O.S. atômica** (upsert no banco) — sem risco de dois pedidos nascerem com o mesmo número quando há mais de um usuário ao mesmo tempo.
9. **Perfis de acesso reforçados de verdade**: Visitante não consegue mais escrever nada via API, mesmo manipulando o front-end.

## Próximos passos sugeridos

- **Front-end já integrado** (ver pasta raiz do projeto e o
  `README.md` principal). O painel, a loja e o backend conversam de
  verdade agora — não há mais trabalho de "ligar os dois lados".
- **Corrigir o menu mobile** do painel (a classe CSS já existe, só
  falta o botão acionar).
- **"Esqueci minha senha"** para clientes da loja (hoje não existe nem
  na versão antiga nem nesta API).
- Publicação: ver `docs/DEPLOY.md`, que cobre Supabase, Render e Vercel.
  Em resumo, o que muda entre os ambientes são duas variáveis —
  `CORS_ORIGINS` aqui, autorizando o endereço do front-end, e
  `VITE_API_URL` na Vercel, apontando para esta API.
