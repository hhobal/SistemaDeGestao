 Deploy da interface React (`web/`)

**Este documento vale para o momento da troca, não para agora.**

Enquanto a migração não termina, nada muda na Vercel: o projeto atual
continua publicando `frontend/`, que é a versão completa — com as 13
seções do painel e a loja virtual.

Publicar o React pela metade não traria ganho nenhum: ninguém acompanha
uma migração em andamento, e um portfólio vale pelo estado final. Para
ver o React durante o desenvolvimento, basta rodá-lo localmente:

```bash
npm run dev --prefix web -- --host   # acessível também pelo celular na mesma rede
```

Quando o React alcançar paridade — todas as seções mais a loja —, a
troca é uma mudança de configuração no projeto que já existe.

---

## 1. Apontar o projeto para a nova interface

No projeto atual da Vercel, em **Settings → General**:

| Campo | Trocar para |
|---|---|
| Framework Preset | **Vite** |
| **Root Directory** | **`web`** |
| Build Command | `npm run build` *(detectado)* |
| Output Directory | `dist` *(detectado)* |

O endereço já divulgado continua o mesmo — passa apenas a servir outro
conteúdo. E, se algo der errado, voltar é reverter esses campos.

### O que o `web/vercel.json` faz

O arquivo é curto e não aceita comentários — a Vercel valida contra um
esquema estrito e recusa qualquer propriedade que não conheça, incluindo
a convenção `"//"` usada em `package.json`. As explicações ficam aqui:

**`rewrites`** — as rotas (`/clientes`, `/pedidos`) existem apenas no
navegador; quem as resolve é o React Router. Sem o rewrite, abrir ou
recarregar qualquer endereço que não a raiz devolveria 404, porque não
há arquivo com esse nome no servidor.

O padrão `/((?!assets/).*)` exclui `/assets` de propósito: ali estão
arquivos reais, e devolver o HTML no lugar do JavaScript quebraria a
aplicação inteira.

**`headers`** — o Vite põe hash no nome dos arquivos de `assets`, então
o conteúdo nunca muda sem o nome mudar junto: cache de um ano é seguro.
Já o `index.html` precisa ser sempre revalidado, senão o navegador serve
uma página antiga que aponta para bundles que já não existem.

## 2. Variável de ambiente

Em **Environment Variables**, antes do primeiro deploy:

| Nome | Valor |
|---|---|
| `VITE_API_URL` | `https://gestaopro-api-wthk.onrender.com/api` |

Marque os três ambientes (Production, Preview, Development).

Sem essa variável o aplicativo chama `/api` no próprio domínio da
Vercel, onde não existe API nenhuma, e toda tela fica em erro de
conexão.

> Tudo que começa com `VITE_` é embutido no JavaScript e fica visível
> para qualquer visitante. Endereço de API pode; senha, chave e token
> nunca.

## 3. CORS

Como o domínio continua o mesmo, `CORS_ORIGINS` no Render **não precisa
mudar** — ele já autoriza `https://gestao-livid-three.vercel.app`.

Confira mesmo assim no **Render → gestaopro-api → Environment**. Se o
endereço tiver mudado, acrescente o novo separado por vírgula; o Render
reinicia sozinho ao salvar.

### Domínios de preview

Cada branch e cada pull request ganham um endereço próprio
(`sistemadegestao-git-minha-branch-usuario.vercel.app`), e nenhum deles
estaria autorizado. Para cobrir todos de uma vez, `CORS_ORIGINS` aceita
curinga:

```
https://gestao-livid-three.vercel.app,https://sistemadegestao-*.vercel.app
```

O `*` cobre só o trecho onde aparece e **não atravessa ponto**, então
`https://sistemadegestao-abc.vercel.app` é aceito e
`https://sistemadegestao.site-de-terceiro.com` não. Ainda assim, prefira
prefixos específicos do seu projeto: um curinga largo demais autoriza
sites que não são seus.

## 4. Conferir

Abra o endereço e verifique, nesta ordem:

- [ ] A tela de login aparece
- [ ] Entrar com `admin` / `admin123` funciona
- [ ] O dashboard mostra números, e não zeros
- [ ] Todas as seções do menu listam dados
- [ ] A loja abre sem login
- [ ] Recarregar a página em `/clientes` continua funcionando *(testa o rewrite de SPA)*
- [ ] O console do navegador não mostra erro de CORS

Se as telas ficarem vazias com erro de CORS no console, o domínio mudou
e falta autorizá-lo no passo 3.

---

## Se algo der errado

Voltar é reverter o **Root Directory** para `.` em Settings → General e
disparar um novo deploy. A versão anterior volta ao ar em minutos,
porque continua no repositório em `frontend/`.

Só remova a pasta `frontend/` quando o React estiver no ar e conferido
por alguns dias.