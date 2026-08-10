# Guia de Deploy

Arquitetura de produção em três serviços gratuitos:

```
Navegador
    │
    ├──► Vercel          frontend/ (HTML, CSS, JS estáticos)
    │
    └──► Render          backend/  (API Express + Prisma)
              │
              └──► Supabase   PostgreSQL
```

---

## 1. Banco de dados — Supabase

### 1.1 Pegar as strings de conexão

No painel do Supabase: **Project Settings → Database → Connection string**.

Você precisa de **duas** strings diferentes:

| Uso                     | Modo                  | Porta  |
|-------------------------|-----------------------|--------|
| `DATABASE_URL`          | Transaction pooler    | `6543` |
| `DIRECT_URL`            | Direct connection     | `5432` |

Por que duas: o Render abre e fecha conexões com frequência, então a API
usa o **pooler** (porta 6543) para não estourar o limite de conexões do
plano free. Mas o `prisma migrate` precisa de uma conexão **direta**
(porta 5432), porque migrations não funcionam através do pooler.

Na URL do pooler, acrescente `?pgbouncer=true&connection_limit=1`:

```
DATABASE_URL="postgresql://postgres.xxxx:SENHA@aws-0-ca-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxx:SENHA@aws-0-ca-central-1.pooler.supabase.com:5432/postgres"
```

### 1.2 Ajustar o schema do Prisma

Em `backend/prisma/schema.prisma`, troque o bloco `datasource`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 1.3 Regerar as migrations

**Atenção:** a migration atual (`20260623152721_inicial`) foi gerada para
SQLite e **não roda no PostgreSQL** — a sintaxe dos tipos é diferente.
É preciso gerar uma nova a partir do zero:

```bash
cd backend
rm -rf prisma/migrations          # no Windows: Remove-Item -Recurse prisma/migrations
npx prisma migrate dev --name inicial
npm run seed
```

Isso cria as 16 tabelas no Supabase e popula o usuário `admin`.

Confirme no Supabase em **Table Editor** — devem aparecer `usuarios`,
`clientes`, `produtos`, `pedidos`, etc.

---

## 2. API — Render

### 2.1 Criar o serviço

**New → Web Service**, conectando o repositório do GitHub.

| Campo          | Valor                                    |
|----------------|------------------------------------------|
| Root Directory | `backend`                                |
| Runtime        | Node                                     |
| Build Command  | `npm install && npx prisma generate`     |
| Start Command  | `npx prisma migrate deploy && npm start` |
| Health Check   | `/api/saude`                             |

O `migrate deploy` no start garante que o banco esteja na versão certa a
cada deploy — diferente de `migrate dev`, ele nunca apaga dados.

### 2.2 Variáveis de ambiente

Em **Environment**, cadastre:

| Variável            | Valor                                              |
|---------------------|----------------------------------------------------|
| `DATABASE_URL`      | string do pooler (porta 6543)                      |
| `DIRECT_URL`        | string direta (porta 5432)                         |
| `NODE_ENV`          | `production`                                       |
| `JWT_SECRET`        | segredo aleatório (**diferente** do local)         |
| `JWT_LOJA_SECRET`   | outro segredo aleatório                            |
| `CORS_ORIGINS`      | `https://gestao-livid-three.vercel.app`            |

Gere cada segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Nunca reaproveite o segredo do `.env` local em produção — se um vazar,
o outro continua seguro.

### 2.3 Verificar

```bash
curl https://SEU-SERVICO.onrender.com/api/saude
# {"ok":true,"ambiente":"production","horario":"..."}
```

---

## 3. Front-end — Vercel

### 3.1 Apontar para a API publicada

Em `frontend/js/config.js`, ajuste a constante:

```js
const API_PRODUCAO = 'https://SEU-SERVICO.onrender.com/api';
```

O arquivo detecta o ambiente pelo hostname: em `localhost` usa
`http://localhost:3001/api`, em qualquer outro domínio usa a URL acima.

### 3.2 Configuração do projeto

O `vercel.json` na raiz já define `outputDirectory: "frontend"`. No painel
da Vercel, confirme:

| Campo            | Valor      |
|------------------|------------|
| Framework Preset | Other      |
| Root Directory   | `.` (raiz) |
| Build Command    | *(vazio)*  |

Não há build step — o front-end é estático puro.

---

## 4. Checklist final

- [ ] `GET /api/saude` responde na URL do Render
- [ ] Login com `admin` / `admin123` funciona na Vercel
- [ ] Console do navegador mostra `[GestãoPro] API: https://...` (não `localhost`)
- [ ] Nenhum erro de CORS no console
- [ ] A loja carrega o catálogo e permite finalizar um pedido
- [ ] O pedido feito na loja aparece no painel

---

## Problemas comuns

**Erro de CORS no console.**
O domínio exato da Vercel precisa estar em `CORS_ORIGINS` no Render —
com `https://`, sem barra no final. A Vercel gera domínios de preview
diferentes a cada branch; adicione o de produção.

**"Não foi possível conectar ao servidor".**
Ou a URL em `config.js` está errada, ou a API do Render está dormindo.
No plano free, o serviço hiberna após 15 minutos sem tráfego e leva
~50 segundos para acordar na primeira requisição.

Para uma demo de portfólio, vale manter a API acordada com um ping
periódico (UptimeRobot, cron-job.org) em `/api/saude` a cada 10 minutos.

**`Can't reach database server` no Render.**
Provavelmente está usando a porta 5432 no `DATABASE_URL`. A API deve usar
a 6543 (pooler); a 5432 fica só no `DIRECT_URL`.

**`prepared statement already exists`.**
Falta `?pgbouncer=true` no final do `DATABASE_URL`.
