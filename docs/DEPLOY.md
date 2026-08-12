# Guia de Deploy

Três serviços gratuitos, cada um cuidando de uma camada:

```
Navegador
    │
    ├──► Vercel      web/      interface React (arquivos estáticos)
    │
    └──► Render      backend/  API Express + Prisma
              │
              └──► Supabase    PostgreSQL
```

---

## 1. Banco — Supabase

### Strings de conexão

No painel: **Connect → ORMs**. São **duas**, e a diferença importa:

| Variável | Modo | Porta | Usada por |
|---|---|---|---|
| `DATABASE_URL` | pooler *transaction* | `6543` | a aplicação |
| `DIRECT_URL` | pooler *session* | `5432` | as migrations |

O Render abre e fecha conexões o tempo todo, então a API usa o pooler
para não estourar o limite do plano gratuito. Já o `prisma migrate`
precisa de uma sessão real, que o modo *transaction* não oferece.

Acrescente `?pgbouncer=true` na primeira: sem isso o Prisma tenta usar
*prepared statements*, que o pooler não suporta, e a API falha com
`prepared statement already exists`.

### Criar as tabelas

```bash
cd backend
npx prisma migrate deploy   # aplica as migrations existentes
npm run seed                # cria o usuário admin
npm run seed:demo           # opcional: 12 meses de dados de demonstração
```

> `seed:demo` **apaga** os dados transacionais e recria o cenário do
> zero. Não rode em um banco com dados que importam.

Confirme no **Table Editor**: devem aparecer `usuarios`, `clientes`,
`produtos`, `pedidos` e as demais — 16 tabelas.

---

## 2. API — Render

**New → Blueprint**, apontando para o repositório. O `render.yaml` na
raiz descreve o serviço; a plataforma pede apenas os valores sensíveis.

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Build | `npm ci && npx prisma generate` |
| Start | `npx prisma migrate deploy && npm start` |
| Health Check | `/api/saude` |

`migrate deploy` no start mantém o banco na versão certa a cada deploy —
diferente de `migrate dev`, ele nunca recria nada.

### Variáveis

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string do pooler (6543) |
| `DIRECT_URL` | string direta (5432) |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | segredo aleatório |
| `JWT_LOJA_SECRET` | outro segredo, diferente do anterior |
| `CORS_ORIGINS` | `https://seu-dominio.vercel.app` |

Gere cada segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Use valores diferentes dos locais: se um `.env` vazar, produção
continua protegida. E os dois JWT precisam ser distintos entre si — é o
que impede um token de cliente da loja de abrir rota administrativa.

### CORS e domínios de preview

`CORS_ORIGINS` aceita curinga, porque a Vercel cria um endereço novo a
cada branch:

```
https://seu-dominio.vercel.app,https://seu-projeto-*.vercel.app
```

O `*` cobre só o trecho onde aparece e **não atravessa ponto**, então
`https://seu-projeto-abc.vercel.app` passa e
`https://seu-projeto.site-de-terceiro.com` não.

---

## 3. Interface — Vercel

Em **Settings → Build and Deployment**:

| Campo | Valor |
|---|---|
| Framework Preset | **Vite** |
| **Root Directory** | **`web`** |
| Build Command | `npm run build` *(detectado)* |
| Output Directory | `dist` *(detectado)* |

Em **Environment Variables**:

| Nome | Valor |
|---|---|
| `VITE_API_URL` | `https://sua-api.onrender.com/api` |

> Tudo que começa com `VITE_` é embutido no JavaScript e fica visível
> para qualquer visitante. Endereço de API pode; senha, chave e token
> nunca. O prefixo é obrigatório — sem ele o Vite não injeta a variável.

Variável é lida **no momento do build**, não em tempo de execução:
depois de alterá-la é preciso um novo deploy, sem cache.

### O que o `web/vercel.json` faz

O arquivo não aceita comentários — a Vercel valida contra um esquema
estrito e recusa qualquer propriedade que não conheça, inclusive a
convenção `"//"` usada em `package.json`. As explicações ficam aqui:

**`rewrites`** — as rotas (`/clientes`, `/loja/carrinho`) existem apenas
no navegador; quem as resolve é o React Router. Sem o rewrite, abrir ou
recarregar qualquer endereço que não a raiz devolveria 404.

O padrão exclui `/assets` de propósito: ali estão arquivos reais, e
devolver o HTML no lugar do JavaScript quebraria a aplicação inteira.

**`headers`** — o Vite põe hash no nome dos arquivos de `assets`, então
o conteúdo nunca muda sem o nome mudar junto: cache de um ano é seguro.
Já o `index.html` precisa ser sempre revalidado, senão o navegador serve
uma página antiga apontando para bundles que já não existem.

---

## 4. Conferir

- [ ] `GET /api/saude` responde com `banco: "ok"`
- [ ] A tela de login aparece
- [ ] `admin` / `admin123` entra
- [ ] O dashboard mostra números, e não zeros
- [ ] Todas as seções do menu listam dados
- [ ] A loja (`/loja`) abre sem login
- [ ] Recarregar em `/clientes` continua funcionando *(testa o rewrite)*
- [ ] O console do navegador não acusa erro de CORS

---

## Problemas comuns

**Telas vazias, erro de CORS no console.**
O domínio exato precisa estar em `CORS_ORIGINS` no Render — com
`https://`, sem barra no final.

**Toda tela em "não foi possível falar com o servidor".**
Falta `VITE_API_URL`, ou o deploy foi feito antes de ela existir. Sem a
variável, o aplicativo procura a API no próprio domínio da Vercel.

**A primeira visita demora ~50 segundos.**
No plano gratuito o Render hiberna após 15 minutos sem tráfego. Um ping
periódico em `/api/saude` a cada 10 minutos (cron-job.org, UptimeRobot)
mantém o serviço acordado — e, como esse endpoint consulta o banco, o
mesmo ping impede o Supabase de pausar o projeto por inatividade.

**`Can't reach database server` no Render.**
Provavelmente há a porta 5432 no `DATABASE_URL`. A aplicação usa a 6543;
a 5432 fica só no `DIRECT_URL`.

**O build falha com `should NOT have additional property`.**
Há uma chave desconhecida no `vercel.json`. Comentários não existem em
JSON.

**O build passa localmente e falha na Vercel.**
`tsc -b` é incremental e reaproveita cache em `node_modules/.tmp`. Para
reproduzir o build da plataforma:

```bash
cd web
rm -rf node_modules dist
npm ci && npm run build
```

**O deploy não dispara ao enviar um commit.**
A opção *Skip deployments when there are no changes to the root
directory* atrapalha em monorepo. Desligue-a em Settings → Build and
Deployment.
