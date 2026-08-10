// ======================================
// LOJA — ESTADO COMPARTILHADO
// ======================================
// Variáveis lidas ou escritas por mais de um módulo. Antes ficavam
// espalhadas no meio do bloco do carrinho; reuni-las aqui deixa
// explícito o que é estado global da página e o que é detalhe interno
// de um módulo (esse continua declarado no próprio arquivo).
//
// ATENÇÃO À ORDEM DOS <script> EM loja.html: este arquivo precisa ser
// carregado antes dos demais, porque `let` no topo de um script cria
// um binding que só existe depois que a linha executa. Como todos os
// outros módulos apenas declaram funções (que rodam depois, a partir
// de init.js), a ordem atual é segura.

// Itens no carrinho: { produtoId, nome, preco, qtd, categoria }
// Persistido no localStorage por lojaSalvarCarrinho() (js/loja-api.js).
let carrinho = [];

// Catálogo bruto que veio da API na última busca/filtro de categoria.
// É a fonte consultada por favoritos, quick view e carrinho para
// resolver um id em produto — por isso precisa ser compartilhado.
let produtosCatalogo = [];

// Resultado após o filtro de preço/favoritos e a ordenação. É o que
// está de fato desenhado na vitrine.
let produtosExibidos = [];

// Filtro "mostrar apenas favoritos" ligado/desligado.
let soFavoritos = false;

// Modo de exibição da vitrine: 'grid' ou 'lista'.
let viewAtual = 'grid';
