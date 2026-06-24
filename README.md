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

## O que foi diagnosticado

O backend (Node + Express + Prisma) já estava praticamente pronto:
rotas, regras de negócio (numeração atômica de pedidos/O.S., baixa de
estoque, lançamentos financeiros automáticos, perfis de acesso) e
segurança (bcrypt, JWT) — tudo implementado corretamente.

O front-end, porém, só tinha **um módulo de verdade conectado à API: Clientes do painel**. Foi esse cadastro que apareceu salvo no banco
durante o teste. Todo o restante — Produtos, Fornecedores, Pedidos,
Ordens de Serviço, Estoque, Finanças, Agenda, Tarefas, Notas, Usuários,
Dashboard, Relatórios e a **loja virtual inteira** (catálogo, cadastro,
login, carrinho, checkout) — ainda lia e gravava exclusivamente em
`localStorage`, sem nunca tocar o backend. Por isso o sistema "parecia"
funcionar (a UI respondia), mas nada além de Clientes realmente
persistia no banco.

## O que foi feito

### Camada de dados do painel — `js/api.js` (substitui `js/localstorage.js`)
Cliente HTTP único com tratamento de sessão/erro (401 desloga
automaticamente) e funções de CRUD para todos os módulos do painel.

### Camada de dados da loja — `js/loja-api.js` (novo arquivo)
Separado de `js/api.js` de propósito: a loja usa um token JWT próprio
(`loja_token`), diferente do token da equipe interna (`erp_sessao`) —
o mesmo isolamento que o backend já impõe entre `autenticar` e
`autenticarCliente`.

### `js/config.js` (novo arquivo)
Único lugar para trocar o endereço da API (`window.__API_BASE_URL__`)
quando o sistema for publicado em outro servidor.

### Módulos do painel reescritos para usar a API real
`clientes.js`, `produtos.js`, `fornecedores.js`, `os.js`, `estoque.js`,
`financas.js`, `agenda.js`, `tarefas.js`, `notas.js`, `usuarios.js`,
`pedidos.js`, `dashboard.js`, `relatorios.js`, `login.js`. O
`app.js` (modais, busca global, alertas, navegação) foi ajustado para
os nomes de campo reais do banco (ex.: `numero` em vez do antigo
`nro`, datas ISO em vez de `dataISO`, objetos relacionados como
`cliente.nome` em vez de string solta).

### Loja virtual reescrita
- `loja.html`: catálogo, carrinho e checkout agora usam
  `GET /api/loja/produtos` e `POST /api/loja/pedidos` de verdade. O
  carrinho continua local (em memória/localStorage) até o checkout —
  só o pedido final vai para o banco, como em qualquer loja real.
- `loja-conta.html`: login/cadastro agora chamam
  `/api/loja/auth/login` e `/api/loja/auth/registrar` (senha com hash
  no servidor, nunca mais texto puro). Também ganhou uma tela "Minha
  conta" com o histórico de pedidos do cliente
  (`GET /api/loja/pedidos`), que não existia antes.

### Bugs corrigidos pelo caminho
- **IDs duplicados no HTML**: `id="totalClientes"` existia em dois
  lugares (card do dashboard e contador da lista de Clientes); o
  segundo nunca era atualizado porque `getElementById` sempre pega o
  primeiro. Renomeado para `totalClientesLista`.
- Removido o botão "Sincronizar clientes da loja": não faz mais
  sentido, já que o backend usa uma única tabela de clientes para
  painel e loja (campo `origem: 'manual' | 'loja'`).
- Removida a criação de usuários fake (`admin`/`operador`) que o front
  antigo gerava sozinho no localStorage — hoje o único usuário inicial
  é o criado pelo `seed.js` do backend, evitando duas fontes
  conflitantes de "quem pode logar".
- Adicionado um campo "Usuário ativo" no formulário de Usuários do
  painel: o backend já suportava desativar um usuário sem excluí-lo,
  mas a tela não expunha esse controle.

### O que foi avaliado e mantido como estava
As máscaras de telefone/CPF, paginação, toasts, modal de confirmação e
todo o CSS/visual não foram tocados — o problema era exclusivamente a
camada de dados, não a interface.

## Limitação desta revisão

Não foi possível **executar** o backend dentro deste ambiente de
análise: o Prisma Client veio pré-compilado para Windows, e o download
do binário Linux (`binaries.prisma.sh`) está fora da rede liberada
neste sandbox. A integração foi validada por leitura cuidadosa de cada
controller/rota do backend (confirmando nomes de campos, formatos de
payload e regras de negócio) e por inspeção direta do banco SQLite
(`backend/prisma/dev.db`) com Python, mas **não por execução ponta a
ponta**. Recomendo, ao rodar localmente pela primeira vez, testar pelo
menos um fluxo de cada módulo (criar um produto, abrir uma O.S., fazer
um pedido na loja) para confirmar que tudo se comporta como esperado —
se algo não bater, normalmente será um pequeno ajuste de nome de campo,
fácil de localizar pelo erro que a própria tela vai mostrar (os erros
da API aparecem como notificação na tela, não silenciosamente).
