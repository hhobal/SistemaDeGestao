# Deploy da interface React (`web/`)

Sobe a nova interface **em paralelo**, sem tocar na que está no ar.
Ao final você terá:

```
gestao-livid-three.vercel.app   → frontend/  (versão atual, intacta)
<novo-endereço>.vercel.app      → web/       (React, em construção)
             ambos consumindo a mesma API no Render
```

A troca do endereço principal só acontece quando o React alcançar
paridade — e é uma mudança de configuração, não de código.

---

## 1. Criar o projeto na Vercel

**Add New → Project** e escolha o repositório `hhobal/SistemaDeGestao`.
Como ele já está ligado a outro projeto na Vercel, a plataforma permite
importar o mesmo repositório de novo; o que muda é a pasta.

| Campo | Valor |
|---|---|
| Project Name | `gestaopro-web` |
| Framework Preset | **Vite** |
| **Root Directory** | **`web`** ← o passo que importa |
| Build Command | `npm run build` *(detectado)* |
| Output Directory | `dist` *(detectado)* |

Se o Root Directory ficar na raiz, a Vercel tenta construir o projeto
errado e o deploy falha.

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

## 3. Autorizar o novo domínio na API

Este é o passo que costuma ser esquecido, e o sintoma é confuso: a tela
carrega, mas nenhum dado aparece.

Depois do primeiro deploy, copie o endereço gerado e vá ao **Render →
gestaopro-api → Environment**. Edite `CORS_ORIGINS` acrescentando o novo
domínio, separado por vírgula:

```
https://gestao-livid-three.vercel.app,https://gestaopro-web.vercel.app
```

O Render reinicia o serviço sozinho ao salvar.

### Domínios de preview

Cada branch e cada pull request ganham um endereço próprio
(`gestaopro-web-git-minha-branch-usuario.vercel.app`), e nenhum deles
estaria autorizado. Para cobrir todos de uma vez, `CORS_ORIGINS` aceita
curinga:

```
https://gestao-livid-three.vercel.app,https://gestaopro-web*.vercel.app
```

O `*` cobre só o trecho onde aparece e **não atravessa ponto**, então
`https://gestaopro-web-abc.vercel.app` é aceito e
`https://gestaopro-web.site-de-terceiro.com` não. Ainda assim, prefira
prefixos específicos do seu projeto: um curinga largo demais autoriza
sites que não são seus.

## 4. Conferir

Abra o endereço novo e verifique, nesta ordem:

- [ ] A tela de login aparece
- [ ] Entrar com `admin` / `admin123` funciona
- [ ] O dashboard mostra números, e não zeros
- [ ] Clientes, Produtos, Pedidos e O.S. listam dados
- [ ] Recarregar a página em `/clientes` continua funcionando *(testa o rewrite de SPA)*
- [ ] O console do navegador não mostra erro de CORS

Se as telas ficarem vazias com erro de CORS no console, falta o passo 3.

---

## Trocar o endereço principal (só no final)

Quando a migração estiver completa, há duas formas:

**A — mover o domínio.** No projeto antigo, remova o domínio; no novo,
adicione. O endereço que você já divulgou continua valendo, agora
apontando para o React.

**B — apontar a raiz para `web/`.** Mudar o Root Directory do projeto
original de `.` para `web`. Mais simples, porém perde o histórico de
deploys da versão anterior.

A opção A é preferível: mantém os dois projetos vivos e permite voltar
atrás trocando o domínio de volta, sem precisar de novo deploy.
