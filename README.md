# GestãoPro — ERP + Loja Virtual

[![CI](https://github.com/hhobal/SistemaDeGestao/actions/workflows/ci.yml/badge.svg)](https://github.com/hhobal/SistemaDeGestao/actions/workflows/ci.yml)

Sistema de gestão empresarial com loja virtual integrada. Reúne painel
administrativo, catálogo público com carrinho e checkout, e uma API REST
com autenticação, controle de estoque e módulo financeiro.

**Demo:** [gestao-livid-three.vercel.app](https://gestao-livid-three.vercel.app/login.html) · `admin` / `admin123`

---

## Sobre o projeto

O sistema atende dois públicos com bases de código separadas mas dados
compartilhados:

- **Painel administrativo** — equipe interna gerencia clientes, produtos,
  pedidos, ordens de serviço, estoque, finanças, agenda e tarefas.
- **Loja virtual** — cliente final navega no catálogo, monta carrinho,
  finaliza compra e acompanha os próprios pedidos.

Um pedido feito na loja aparece imediatamente no painel, baixa o estoque e
gera o lançamento financeiro correspondente — em uma única transação.

## Stack

| Camada       | Tecnologias                                              |
|--------------|----------------------------------------------------------|
| Front-end    | HTML5, CSS3, JavaScript (ES6+) — sem framework, sem build |
| Back-end     | Node.js, Express 4                                        |
| Banco        | PostgreSQL (produção) · SQLite (desenvolvimento)          |
| ORM          | Prisma 5                                                  |
| Autenticação | JWT (`jsonwebtoken`) + bcrypt                             |
| Validação    | Zod                                                       |
| Segurança    | Helmet, CORS configurável                                 |
| Testes       | Vitest, Supertest                                         |
| CI           | GitHub Actions                                            |
| Deploy       | Vercel (front-end) · Render (API) · Supabase (PostgreSQL) |

## Arquitetura

O back-end segue separação em camadas — cada requisição atravessa rota,
validação, controller e service antes de tocar o banco:

```
requisição
    ↓
routes/          define o endpoint e aplica middlewares
    ↓
middleware/      auth (JWT) · validate (Zod) · errorHandler
    ↓
controllers/     traduz HTTP ↔ domínio, sem regra de negócio
    ↓
services/        regra de negócio e transações
    ↓
lib/prisma.js    acesso ao banco
```

```
.
├── frontend/              Aplicação estática (deploy na Vercel)
│   ├── index.html           painel administrativo
│   ├── login.html           autenticação da equipe
│   ├── loja.html            catálogo público + carrinho
│   ├── loja-conta.html      área do cliente
│   ├── css/
│   │   ├── style.css        painel administrativo
│   │   └── loja.css         loja virtual
│   └── js/
│       ├── config.js        detecta o ambiente e define a URL da API
│       ├── api.js           cliente HTTP do painel
│       ├── loja-api.js      cliente HTTP da loja
│       ├── *.js             um módulo por área do painel
│       └── loja/            módulos da loja virtual
│           ├── estado.js      estado compartilhado entre os módulos
│           ├── ui.js          formatação, ícones e notificações
│           ├── sessao.js      sessão do cliente
│           ├── carrinho.js    carrinho e painéis laterais
│           ├── favoritos.js   favoritos
│           ├── catalogo.js    vitrine, filtros e ordenação
│           ├── quickview.js   visualização rápida do produto
│           ├── checkout.js    checkout em 3 etapas
│           └── init.js        inicialização da página
│
├── backend/              API REST (deploy no Render)
│   ├── src/
│   │   ├── app.js           montagem do Express
│   │   ├── server.js        ponto de entrada + shutdown gracioso
│   │   ├── config/          leitura centralizada do .env
│   │   ├── routes/          16 módulos · 78 endpoints
│   │   ├── controllers/
│   │   ├── services/        regra de negócio e transações
│   │   ├── middleware/      auth · validate · errorHandler
│   │   └── utils/           jwt · senha · paginação · numeração
│   ├── prisma/
│   │   ├── schema.prisma    16 models
│   │   ├── migrations/
│   │   └── seed.js
│   └── tests/               35 testes (Vitest + Supertest)
│       ├── helpers/           fábricas e limpeza de banco
│       ├── setup.js           ambiente isolado de teste
│       └── global-setup.js    cria o banco da suíte
│
├── .github/workflows/    CI no GitHub Actions
└── docs/                 Documentação técnica
```

## Decisões técnicas

Alguns problemas que apareceram durante o desenvolvimento e como foram
resolvidos:

**Numeração sequencial sem condição de corrida.** Gerar `#0001`, `#0002`
contando registros existentes falha quando dois usuários criam pedidos ao
mesmo tempo — ambos leem o mesmo total e geram o mesmo número. A tabela
`Contador` resolve isso com incremento atômico dentro da transação.

**Preço histórico nos pedidos.** `ItemPedido` guarda `nome` e
`precoUnitario` como snapshot do momento da compra. Sem isso, reajustar o
preço de um produto reescreveria o valor de todos os pedidos antigos.

**Cadastro único de cliente.** Uma tabela `Cliente` serve tanto ao ERP
quanto à loja; o campo `senhaHash` só é preenchido quando o cliente cria
login. A alternativa — duas tabelas sincronizadas manualmente — gerava
duplicatas.

**Dois escopos de autenticação.** Painel e loja usam segredos JWT
distintos (`JWT_SECRET` e `JWT_LOJA_SECRET`). Um token de cliente nunca
é aceito em rota administrativa, mesmo que o algoritmo seja o mesmo.

**Portabilidade entre SQLite e PostgreSQL.** Campos de status usam `String`
em vez de `enum` do Prisma, já que SQLite não tem enum nativo. A validação
dos valores permitidos fica na camada da API, com Zod. O mesmo schema roda
nos dois bancos sem alteração.

## Rodando localmente

Requer Node.js 18+ e Docker (para o banco).

```bash
# 1. Instalar dependências e gerar o Prisma Client
npm run setup

# 2. Configurar o ambiente
cp backend/.env.example backend/.env
#    Preencha DATABASE_URL e DIRECT_URL com as strings do seu
#    PostgreSQL (Supabase, ou um container local).
#    Gere os segredos JWT com:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Criar as tabelas e popular com dados de exemplo
npm run db:migrate
npm run seed

# 4. Subir a API — http://localhost:3001
npm run dev

# 5. Em outro terminal, servir o front-end — http://localhost:5500
npm run dev:front
```

Acesse `http://localhost:5500/login.html` (painel) ou
`http://localhost:5500/loja.html` (loja). Credenciais padrão do seed:
`admin` / `admin123`.

Para inspecionar o banco visualmente: `npm run db:studio`.

## Testes

35 testes cobrindo a regra de negócio crítica, executados com Vitest e
Supertest sobre um PostgreSQL descartável — o mesmo banco da produção,
recriado do zero a cada execução.

```bash
docker compose up -d  # sobe o PostgreSQL de teste (porta 5434)
npm test              # roda a suíte
npm run test:coverage # com relatório de cobertura
```

| Suíte                      | Foco                                                    |
|----------------------------|---------------------------------------------------------|
| `pedidos.service.test.js`  | checkout transacional, estoque, snapshot de preço, rollback |
| `auth.test.js`             | login, proteção de rotas, perfis, isolamento de tokens  |
| `numeracao.test.js`        | numeração sequencial sob concorrência                   |

Cobertura de `pedidos.service.js` — o módulo mais crítico — em 100%.

Alguns cenários que a suíte garante:

- Um pedido que falha no meio **não deixa resíduo**: nenhum registro,
  nenhuma baixa de estoque, nenhum lançamento financeiro.
- O preço enviado pelo navegador é **ignorado**; o total vem sempre do
  banco, mesmo que o checkout seja adulterado.
- Alterar o preço de um produto **não reescreve** pedidos já fechados.
- 20 pedidos criados simultaneamente recebem 20 números distintos, sem
  buracos na sequência.
- Um token da loja **não abre** rota administrativa.
- Usuário desativado após o login perde o acesso na requisição seguinte.

> A suíte encontrou um deadlock real durante o desenvolvimento:
> `registrarLog()` era chamado de dentro da transação usando o client
> global do Prisma, travando à espera do lock que a própria transação
> segurava. Corrigido movendo a auditoria para depois do commit.

## API

78 endpoints REST distribuídos em 16 módulos. Todas as rotas do painel
exigem o header `Authorization: Bearer <token>`.

| Módulo         | Base                | Responsabilidade                        |
|----------------|---------------------|-----------------------------------------|
| Autenticação   | `/api/auth`         | login, perfil, troca de senha           |
| Clientes       | `/api/clientes`     | CRUD + histórico                        |
| Fornecedores   | `/api/fornecedores` | CRUD                                    |
| Produtos       | `/api/produtos`     | CRUD + catálogo                         |
| Pedidos        | `/api/pedidos`      | criação transacional, status            |
| Ordens Serviço | `/api/os`           | abertura, andamento, conclusão          |
| Estoque        | `/api/estoque`      | movimentações, alertas de mínimo        |
| Finanças       | `/api/financas`     | lançamentos, fluxo de caixa             |
| Agenda         | `/api/agenda`       | eventos e compromissos                  |
| Tarefas        | `/api/tarefas`      | quadro kanban                           |
| Notas          | `/api/notas`        | anotações rápidas                       |
| Usuários       | `/api/usuarios`     | gestão de acesso e perfis               |
| Dashboard      | `/api/dashboard`    | indicadores consolidados                |
| Relatórios     | `/api/relatorios`   | vendas, estoque, financeiro             |
| Backup         | `/api/backup`       | exportação e importação de dados        |
| Loja           | `/api/loja`         | catálogo, conta e checkout do cliente   |

Verificação de saúde: `GET /api/saude`.

## Variáveis de ambiente

Documentadas em [`backend/.env.example`](backend/.env.example).

| Variável             | Descrição                                    |
|----------------------|----------------------------------------------|
| `DATABASE_URL`       | String de conexão do banco                   |
| `PORT`               | Porta da API (padrão `3001`)                 |
| `NODE_ENV`           | `development` ou `production`                |
| `JWT_SECRET`         | Segredo dos tokens do painel                 |
| `JWT_LOJA_SECRET`    | Segredo dos tokens da loja (deve ser outro)  |
| `CORS_ORIGINS`       | Origens autorizadas, separadas por vírgula   |

## Licença

MIT
