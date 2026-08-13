# GESTIQ — ERP + Loja Virtual

[![CI](https://github.com/hhobal/SistemaDeGestao/actions/workflows/ci.yml/badge.svg)](https://github.com/hhobal/SistemaDeGestao/actions/workflows/ci.yml)

Sistema de gestão empresarial com loja virtual integrada. Reúne painel
administrativo, catálogo público com carrinho e checkout, e uma API REST
com autenticação, controle de estoque e módulo financeiro.

**Demo:** [gestao-livid-three.vercel.app](https://gestao-livid-three.vercel.app/login) · `admin` / `admin123`

> A API hiberna após 15 minutos sem uso — o plano gratuito do Render.
> O primeiro acesso depois disso leva cerca de 30 segundos para o
> servidor subir; a partir daí as respostas ficam abaixo de 300 ms.

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

| Camada       | Tecnologias                                                |
|--------------|------------------------------------------------------------|
| Front-end    | React 19, TypeScript, Vite, Tailwind 4                      |
| Dados no cliente | TanStack Query · React Hook Form · Zod                  |
| Back-end     | Node.js, Express 4                                          |
| Banco        | PostgreSQL em todos os ambientes (Supabase em produção)     |
| ORM          | Prisma 5                                                    |
| Autenticação | JWT (`jsonwebtoken`) + bcrypt                               |
| Validação    | Zod nas duas pontas                                         |
| Segurança    | Helmet, CORS com curinga, rate limiting, escape por padrão  |
| Testes       | Vitest, Supertest, Testing Library                          |
| CI           | GitHub Actions                                              |
| Deploy       | Vercel (interface) · Render (API) · Supabase (PostgreSQL)   |

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
├── web/                  Interface React (deploy na Vercel)
│   └── src/
│       ├── comum/          cliente HTTP, tipos e componentes de tela
│       ├── auth/           sessão, guarda de rota e login
│       ├── tema/           alternância claro/escuro
│       ├── layout/         casca do painel e notificações
│       ├── modulos/        uma pasta por área: dados + tela + teste
│       └── loja/           catálogo, carrinho e conta do cliente
│
├── backend/              API REST (deploy no Render)
│   ├── src/
│   │   ├── app.js          montagem do Express
│   │   ├── server.js       ponto de entrada + shutdown gracioso
│   │   ├── config/         .env e origens autorizadas
│   │   ├── routes/         16 módulos · 78 endpoints
│   │   ├── controllers/    traduz HTTP ↔ domínio
│   │   ├── services/       regra de negócio e transações
│   │   ├── middleware/     auth · validate · rateLimit · errorHandler
│   │   └── utils/          jwt · senha · paginação · numeração
│   ├── prisma/
│   │   ├── schema.prisma   16 models
│   │   ├── migrations/
│   │   ├── seed.js         usuário administrador inicial
│   │   └── seed-demo.js    12 meses de dados de demonstração
│   └── tests/              62 testes
│
├── .github/workflows/    CI no GitHub Actions
├── docker-compose.yml    PostgreSQL descartável para os testes
├── render.yaml           infraestrutura da API como código
└── docs/DEPLOY.md        publicação nos três serviços
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

**Dinheiro em `Decimal`, nunca em `Float`.** Ponto flutuante não
representa decimais exatamente: somar mil vendas de R$ 12,10 dá
`12100.000000000218`. Os sete campos monetários usam `Decimal(12,2)` e as
contas usam `.mul()`/`.add()` em vez de `*` e `+`, que voltariam a
converter para float. Há testes cobrindo exatamente esses casos.

**Tema em uma lista só de cores.** Os componentes referenciam nomes
(`--color-fundo`, `--color-texto`), e cada tema atribui outros valores
aos mesmos nomes — nenhuma tela sabe qual está ativo. Manter duas listas
de cores em paralelo é o que fazia o tema claro da versão anterior
quebrar: bastava uma sair de sincronia para aparecer texto escuro sobre
fundo escuro. Um teste compara os dois blocos e falha se algum token
ficar sem versão clara.

**Contraste medido, não estimado.** Uma paleta pode parecer boa e ser
ilegível — o âmbar da marca sobre branco dá 4.06:1, abaixo do mínimo do
WCAG, e olhando não dá para saber. Trinta testes leem as cores do
`index.css` e calculam a razão de cada par que aparece na tela; foram
eles que obrigaram a marca a virar bronze no tema claro e o `aviso` a
sair do amarelo, que estava indistinguível do âmbar. Piorar uma cor
agora quebra a suíte em vez de chegar em produção.

**Interface organizada por módulo, não por tipo de arquivo.** A divisão
inicial agrupava telas em `paginas/` e componentes em `componentes/`,
então cada tela buscava seus próprios dados numa pasta irmã — mexer em
Pedidos significava abrir três pastas diferentes. Hoje `modulos/pedidos/`
contém as requisições, os componentes e o teste do módulo. Um import de
um módulo dentro de outro passa a ser um sinal visível de acoplamento.

**Pacote dividido por área.** As dezesseis telas vinham num arquivo só
de 507 kB, mesmo para quem só ia abrir o login. Cada tela agora é um
pedaço carregado sob demanda, e o primeiro acesso baixa 385 kB — a
casca fica visível enquanto a página chega, então a navegação não pisca.
Quem entra no painel nunca baixa o carrinho, e quem visita a loja nunca
baixa os relatórios.

**Identificação do cliente atrás de proxy.** A requisição atravessa
Cloudflare e o balanceador do Render, deixando três endereços em
`X-Forwarded-For`. O `req.ip` do Express resolve para o último — um IP
interno que muda a cada chamada, o que zerava o contador do limite de
tentativas. O limitador usa `CF-Connecting-IP`, que o Cloudflare
sobrescreve e o visitante não consegue forjar.

**Status como `String`, não `enum`.** A validação dos valores permitidos
fica na camada da API, com Zod — assim adicionar um status novo não exige
migration nem downtime.

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

# 5. Em outro terminal, a interface — http://localhost:5173
npm run dev:web
```

Acesse `http://localhost:5173` (painel) ou `http://localhost:5173/loja`.
Credenciais do seed: `admin` / `admin123`.

O Vite encaminha `/api` para a porta 3001, então em desenvolvimento o
navegador vê tudo na mesma origem e não há CORS.

Para popular o sistema com doze meses de dados — clientes, pedidos,
ordens de serviço e financeiro coerentes entre si — rode
`npm run seed:demo`. Ele **apaga** os dados transacionais antes de
recriar o cenário.

Para inspecionar o banco visualmente: `npm run db:studio`.

## Testes

**244 testes** — 62 na API, sobre um PostgreSQL descartável recriado do
zero a cada execução, e 182 na interface, num DOM real com jsdom.

```bash
docker compose up -d   # PostgreSQL de teste (porta 5434)
npm test               # roda as duas suítes
```

O foco está nas funções que **decidem alguma coisa** — o que pode ser
editado, o que já venceu, o que uma mudança de status provoca — e não na
aparência. Cobertura de `pedidos.service.js`, o módulo mais crítico, em
100%.

Alguns cenários que a suíte garante:

- Um pedido que falha no meio **não deixa resíduo**: nenhum registro,
  nenhuma baixa de estoque, nenhum lançamento financeiro.
- O preço enviado pelo navegador é **ignorado**; o total vem sempre do
  banco, mesmo que o checkout seja adulterado.
- Alterar o preço de um produto **não reescreve** pedidos já fechados.
- 20 pedidos criados simultaneamente recebem 20 números distintos, sem
  buracos na sequência.
- Um token da loja **não abre** rota administrativa, e as duas sessões
  convivem sem uma derrubar a outra.
- Usuário desativado após o login perde o acesso na requisição seguinte.
- O último Administrador ativo não pode ser removido, desativado nem
  rebaixado.

Regras que existem nos dois lados — no servidor, que recusa, e no
cliente, que explica antes — têm testes garantindo que as duas versões
concordam.

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
