# GestãoPro — Sistema de Gestão + Loja Virtual

Sistema completo: painel administrativo (`index.html`), loja virtual
pública (`loja.html` + `loja-conta.html`) e API/banco de dados
(`backend/`). 

## Como rodar (resumo rápido)

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env          # se ainda não existir um .env
npx prisma generate
npx prisma migrate dev --name inicial
npm run seed                  # cria o usuário admin/admin123 e produtos de exemplo
npm run dev                   # API em http://localhost:3000

# 2) Front-end (em outro terminal, na raiz do projeto)
python3 -m http.server 5500
# abra http://localhost:5500/login.html  (painel)
# e    http://localhost:5500/loja.html    (loja)
```

Veja `backend/README.md` para detalhes (variáveis de ambiente, CORS,
visão completa da API).

---

