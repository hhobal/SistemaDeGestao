// ======================================
// LOJA VIRTUAL — DADOS E REGRAS
// ======================================
// A loja é o outro público do sistema: cliente final, não equipe.
// Usa `escopo: 'loja'` em todas as chamadas autenticadas, para que o
// cliente HTTP anexe o token do cliente e não o do lojista.
//
// O catálogo é público de propósito — quem chega não precisa criar
// conta para ver os produtos. Só o checkout exige login.

import { z } from 'zod';
import { api, gravarSessaoLoja, lerSessaoLoja, limparSessao, query, type SessaoLoja } from '@/comum/api';
import type { Dinheiro } from '@/comum/tipos';

export type ProdutoLoja = {
  id: number;
  nome: string;
  categoria: string | null;
  preco: Dinheiro;
  descricao: string | null;
  estoque: number;
  estoqueMin: number;
  criadoEm: string;
};

export type ItemPedidoLoja = {
  id: number;
  nome: string;
  precoUnitario: Dinheiro;
  quantidade: number;
  subtotal: Dinheiro;
};

export type PedidoLoja = {
  id: number;
  numero: string;
  total: Dinheiro;
  pagamento: string;
  parcelas: number;
  status: string;
  data: string;
  enderecoEntrega: string | null;
  itens: ItemPedidoLoja[];
};

export const chavesLoja = {
  catalogo: (busca: string, categoria: string) => ['loja', 'catalogo', busca, categoria] as const,
  categorias: ['loja', 'categorias'] as const,
  meusPedidos: ['loja', 'meus-pedidos'] as const
};

export const listarCatalogo = (busca: string, categoria: string, sinal?: AbortSignal) =>
  api.get<ProdutoLoja[]>(`/loja/produtos${query({ busca, categoria })}`, {
    semAutenticacao: true,
    sinal
  });

export const listarCategoriasLoja = () =>
  api.get<string[]>('/loja/produtos/categorias', { semAutenticacao: true });

export const meusPedidos = () =>
  api.get<PedidoLoja[]>('/loja/pedidos', { escopo: 'loja' });

// ─── CONTA DO CLIENTE ───────────────────────────────────

export const esquemaLoginLoja = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe a senha.')
});

export const esquemaCadastroLoja = z.object({
  nome: z.string().trim().min(1, 'Informe seu nome.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  telefone: z.string().trim(),
  endereco: z.string().trim(),
  senha: z.string().min(6, 'A senha precisa de pelo menos 6 caracteres.')
});

export type DadosLogin = z.output<typeof esquemaLoginLoja>;
export type DadosCadastro = z.output<typeof esquemaCadastroLoja>;

export async function entrarNaLoja(dados: DadosLogin) {
  const sessao = await api.post<SessaoLoja>('/loja/auth/login', dados, { semAutenticacao: true });
  gravarSessaoLoja(sessao);
  return sessao;
}

export async function cadastrarNaLoja(dados: DadosCadastro) {
  const sessao = await api.post<SessaoLoja>('/loja/auth/registrar', dados, {
    semAutenticacao: true
  });
  gravarSessaoLoja(sessao);
  return sessao;
}

export const sairDaLoja = () => limparSessao('loja');
export const clienteLogado = () => lerSessaoLoja();

// ─── CARRINHO ───────────────────────────────────────────
// Vive só no navegador: é uma intenção de compra, não um registro do
// sistema. Vira pedido apenas no checkout, quando o servidor confere
// estoque e preço.

const CHAVE_CARRINHO = 'gestaopro_carrinho';

export type ItemCarrinho = {
  produtoId: number;
  nome: string;
  preco: number;
  quantidade: number;
};

export function lerCarrinho(): ItemCarrinho[] {
  try {
    const bruto = localStorage.getItem(CHAVE_CARRINHO);
    const itens = bruto ? (JSON.parse(bruto) as ItemCarrinho[]) : [];
    // Descarta entradas malformadas em vez de quebrar a loja inteira:
    // o conteúdo do localStorage é editável por quem abrir o DevTools.
    return Array.isArray(itens)
      ? itens.filter(i => typeof i?.produtoId === 'number' && i.quantidade > 0)
      : [];
  } catch {
    return [];
  }
}

export function gravarCarrinho(itens: ItemCarrinho[]) {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
}

export const limparCarrinho = () => localStorage.removeItem(CHAVE_CARRINHO);

/** Soma do carrinho. Só para exibir — o total que vale é o do servidor. */
export const totalCarrinho = (itens: ItemCarrinho[]) =>
  itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);

export const quantidadeTotal = (itens: ItemCarrinho[]) =>
  itens.reduce((soma, item) => soma + item.quantidade, 0);

/**
 * Adiciona respeitando o estoque disponível.
 *
 * O limite também é conferido no servidor, dentro da transação do
 * pedido. Aqui serve para avisar antes, e não para proteger: qualquer
 * pessoa pode alterar o localStorage.
 */
export function adicionarAoCarrinho(
  itens: ItemCarrinho[],
  produto: ProdutoLoja,
  quantidade = 1
): { itens: ItemCarrinho[]; aviso: string | null } {
  const existente = itens.find(i => i.produtoId === produto.id);
  const jaNoCarrinho = existente?.quantidade ?? 0;
  const desejado = jaNoCarrinho + quantidade;

  if (produto.estoque <= 0) {
    return { itens, aviso: `${produto.nome} está sem estoque.` };
  }
  if (desejado > produto.estoque) {
    return {
      itens,
      aviso: `Só temos ${produto.estoque} unidade(s) de ${produto.nome}.`
    };
  }

  const novos = existente
    ? itens.map(i => (i.produtoId === produto.id ? { ...i, quantidade: desejado } : i))
    : [
        ...itens,
        {
          produtoId: produto.id,
          nome: produto.nome,
          preco: Number(produto.preco),
          quantidade
        }
      ];

  return { itens: novos, aviso: null };
}

// ─── CHECKOUT ───────────────────────────────────────────

export const FORMAS_PAGAMENTO = ['pix', 'cartao', 'boleto'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const ROTULO_PAGAMENTO_LOJA: Record<FormaPagamento, string> = {
  pix: 'PIX',
  cartao: 'Cartão de crédito',
  boleto: 'Boleto bancário'
};

export const esquemaCheckout = z.object({
  enderecoEntrega: z.string().trim().min(1, 'Informe o endereço de entrega.'),
  pagamento: z.enum(FORMAS_PAGAMENTO),
  parcelas: z.coerce.number().int().min(1).max(12)
});

// O <select> de parcelas devolve string; z.coerce converte. Por isso a
// entrada e a saída do schema são tipos diferentes — o formulário
// trabalha com a entrada, e a função de envio recebe a saída.
export type FormularioCheckout = z.input<typeof esquemaCheckout>;
export type DadosCheckout = z.output<typeof esquemaCheckout>;

export function finalizarPedido(itens: ItemCarrinho[], dados: DadosCheckout) {
  // Manda só produto e quantidade: preço e total vêm do banco. Confiar
  // no valor do navegador deixaria o checkout adulterável.
  return api.post<PedidoLoja>(
    '/loja/pedidos',
    {
      itensCarrinho: itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
      enderecoEntrega: dados.enderecoEntrega,
      pagamento: dados.pagamento,
      parcelas: dados.pagamento === 'cartao' ? dados.parcelas : 1
    },
    { escopo: 'loja' }
  );
}
