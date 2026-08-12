# GestãoPro — Interface (React)

Reescrita do painel administrativo em React, consumindo a mesma API REST
da versão anterior.

## Por que existe

A interface original (`../frontend/`) é HTML, CSS e JavaScript sem
framework. Funciona e continua no ar, mas acumulou três limites que
atrapalham a evolução:

- comportamento escrito em atributos `onclick` dentro de strings,
  impossível de testar isoladamente;
- estilo fixo na marcação, o que impede trocar o tema pelo CSS;
- HTML montado por concatenação, onde cada interpolação é um risco de
  XSS que precisa ser lembrado manualmente.

Como toda a regra de negócio já vive no servidor — transação de estoque,
numeração, financeiro e permissões —, trocar a camada de visualização
não move risco para lugar nenhum: a API é a mesma, já testada.

## Stack

| Camada      | Escolha                | Motivo                                                        |
|-------------|------------------------|---------------------------------------------------------------|
| Build       | Vite                   | Sem SSR: a API já é um Express separado                        |
| Linguagem   | TypeScript             | O formato das respostas vira contrato verificado na compilação |
| Dados       | TanStack Query         | Cache, estados de carregamento e revalidação                   |
| Estilo      | Tailwind 4             | Tokens em CSS, sem estilo fixo na marcação                     |
| Rotas       | React Router           | Navegação e proteção de rota em um lugar só                    |
| Formulários | React Hook Form + Zod  | Mesma biblioteca de validação usada no back-end                |

## Rodando

```bash
# 1. A API precisa estar no ar (na raiz do projeto)
npm run dev            # sobe o Express em http://localhost:3001

# 2. Nesta pasta
npm install
npm run dev            # http://localhost:5173
```

O `vite.config.ts` encaminha `/api` para `localhost:3001`, então o
navegador vê tudo na mesma origem e não há CORS em desenvolvimento.

Para apontar para a API publicada, crie um `.env.local`:

```
VITE_API_URL=https://gestaopro-api-wthk.onrender.com/api
```

## Estrutura

```
src/
├── lib/api.ts          cliente HTTP: URL base, token e reação ao 401
├── auth/               sessão, contexto e guarda de rota
├── layout/Shell.tsx    sidebar + topbar das telas privadas
└── paginas/            uma pasta por tela
```

O ponto central é `lib/api.ts`: toda chamada passa por ali, então anexar
o token e derrubar a sessão expirada acontece uma vez, e não em cada
tela.

## Telas

**Painel** — login, dashboard, clientes, fornecedores, produtos, estoque,
pedidos, ordens de serviço, finanças, agenda, tarefas, notas, relatórios
e usuários.

**Loja** — catálogo público, carrinho, checkout e área do cliente.

A migração está completa: todas as seções da interface anterior existem
aqui. A versão em `../frontend/` continua no repositório até a troca do
domínio ser confirmada em produção (ver `docs/DEPLOY-WEB.md`).

## Testes

```bash
npm test
```

145 testes cobrindo o cliente HTTP, as regras de cada módulo e a tela de
Clientes renderizada num DOM. O foco está nas funções que decidem
alguma coisa — o que pode ser editado, o que já venceu, o que a
mudança de status provoca — e não na aparência.

As mesmas regras existem no servidor, que é quem de fato recusa. As
daqui servem para explicar o motivo antes da tentativa, e os testes
garantem que as duas versões concordam.
