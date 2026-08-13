# GESTIQ — Interface (React)

Reescrita do painel administrativo em React, consumindo a mesma API REST
da versão anterior.

## Por que existe

A interface original era HTML, CSS e JavaScript sem framework.
Funcionava, mas acumulou três limites que atrapalhavam a evolução:

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

Requer Node.js 22.22+ ou 24.15+ — exigência do jsdom, usado pelos
testes. O build sozinho roda a partir do Node 20.19.

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

Cada módulo do sistema é uma pasta fechada: dados, formulário, tela e
teste ficam juntos. Abrir `modulos/pedidos/` mostra tudo que existe
sobre pedidos, e nada além disso.

```
src/
├── comum/                  o que é usado por mais de um módulo
│   ├── api.ts                cliente HTTP: URL base, token e reação ao 401
│   ├── tipos.ts              formatos que a API devolve
│   └── componentes/          Tabela, Modal, Campo, Botão, Paginação
│
├── auth/                   sessão, guarda de rota e tela de login
├── tema/                   alternância claro/escuro
├── layout/                 sidebar, topbar e notificações
│
├── modulos/                uma pasta por área do painel
│   └── pedidos/
│       ├── api.ts            requisições, tipos e regras do módulo
│       ├── DetalhesPedido.tsx
│       ├── EtiquetaStatus.tsx
│       ├── Pedidos.tsx       a tela
│       └── pedidos.test.ts
│
└── loja/                   a área pública, com carrinho e checkout
```

Duas regras sustentam o desenho:

**O módulo é a unidade.** Um import de `@/modulos/clientes/...` dentro de
`modulos/pedidos/` é sinal de que algo está no lugar errado — ou pertence
a `comum/`, ou os dois módulos são um só. Antes, cada tela vivia em
`paginas/` e buscava seus dados numa pasta irmã; mover ou apagar uma
funcionalidade exigia caçar pedaços dela em três lugares.

**`@/` aponta para `src/`.** Imports entre pastas não dependem de onde o
arquivo está, então mover um módulo não reescreve caminho nenhum. Dentro
da própria pasta continua `./api`, que já diz "isto é meu".

O ponto central é `comum/api.ts`: toda chamada passa por ali, então
anexar o token e derrubar a sessão expirada acontece uma vez, e não em
cada tela.

## Telas

**Painel** — login, dashboard, clientes, fornecedores, produtos, estoque,
pedidos, ordens de serviço, finanças, agenda, tarefas, notas, relatórios
e usuários.

**Loja** — catálogo público, carrinho, checkout e área do cliente.

A migração está completa e a versão anterior foi removida: esta é a
única interface do projeto. Para publicar, ver `docs/DEPLOY.md`.

## Testes

```bash
npm test
```

182 testes cobrindo o cliente HTTP, as regras de cada módulo e a tela de
Clientes renderizada num DOM. Cada arquivo de teste fica ao lado do
código que exercita, dentro do próprio módulo. O foco está nas funções
que decidem alguma coisa — o que pode ser editado, o que já venceu, o
que a mudança de status provoca — e não na aparência.

As mesmas regras existem no servidor, que é quem de fato recusa. As
daqui servem para explicar o motivo antes da tentativa, e os testes
garantem que as duas versões concordam.
