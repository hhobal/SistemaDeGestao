// ======================================
// LOJA — CARRINHO E ESCOPOS DE SESSÃO
// ======================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  adicionarAoCarrinho,
  esquemaCheckout,
  gravarCarrinho,
  lerCarrinho,
  quantidadeTotal,
  totalCarrinho,
  type ItemCarrinho,
  type ProdutoLoja
} from '../loja/api';
import {
  gravarSessao,
  gravarSessaoLoja,
  lerSessao,
  lerSessaoLoja,
  limparSessao,
  type Sessao,
  type SessaoLoja
} from '../lib/api';

const PRODUTO: ProdutoLoja = {
  id: 1,
  nome: 'SSD NVMe 1TB',
  categoria: 'Armazenamento',
  preco: '529.90',
  descricao: null,
  estoque: 3,
  estoqueMin: 2,
  criadoEm: '2026-01-01T00:00:00Z'
};

beforeEach(() => localStorage.clear());

describe('adicionarAoCarrinho', () => {
  it('converte o preço em número ao guardar', () => {
    // A API devolve Decimal como string; o carrinho faz contas.
    const { itens } = adicionarAoCarrinho([], PRODUTO);
    expect(itens[0].preco).toBe(529.9);
    expect(typeof itens[0].preco).toBe('number');
  });

  it('soma à quantidade quando o produto já está no carrinho', () => {
    const primeiro = adicionarAoCarrinho([], PRODUTO).itens;
    const segundo = adicionarAoCarrinho(primeiro, PRODUTO).itens;
    expect(segundo).toHaveLength(1);
    expect(segundo[0].quantidade).toBe(2);
  });

  it('recusa quando ultrapassaria o estoque', () => {
    const cheio: ItemCarrinho[] = [
      { produtoId: 1, nome: PRODUTO.nome, preco: 529.9, quantidade: 3 }
    ];
    const resultado = adicionarAoCarrinho(cheio, PRODUTO);
    expect(resultado.aviso).toMatch(/só temos 3/i);
    // O carrinho não pode mudar quando a adição é recusada.
    expect(resultado.itens).toBe(cheio);
  });

  it('considera o que já está no carrinho ao checar o limite', () => {
    const doisNoCarrinho: ItemCarrinho[] = [
      { produtoId: 1, nome: PRODUTO.nome, preco: 529.9, quantidade: 2 }
    ];
    // 2 + 2 = 4 passaria do estoque de 3.
    expect(adicionarAoCarrinho(doisNoCarrinho, PRODUTO, 2).aviso).not.toBeNull();
    // 2 + 1 = 3 cabe exatamente.
    expect(adicionarAoCarrinho(doisNoCarrinho, PRODUTO, 1).aviso).toBeNull();
  });

  it('recusa produto esgotado', () => {
    const esgotado = { ...PRODUTO, estoque: 0 };
    expect(adicionarAoCarrinho([], esgotado).aviso).toMatch(/sem estoque/i);
  });
});

describe('totais', () => {
  const itens: ItemCarrinho[] = [
    { produtoId: 1, nome: 'A', preco: 529.9, quantidade: 2 },
    { produtoId: 2, nome: 'B', preco: 89.9, quantidade: 1 }
  ];

  it('soma preço vezes quantidade', () => {
    expect(totalCarrinho(itens)).toBeCloseTo(1149.7, 2);
  });

  it('conta as unidades, não as linhas', () => {
    expect(quantidadeTotal(itens)).toBe(3);
  });

  it('devolve zero para carrinho vazio', () => {
    expect(totalCarrinho([])).toBe(0);
    expect(quantidadeTotal([])).toBe(0);
  });
});

describe('leitura do carrinho gravado', () => {
  it('recupera o que foi gravado', () => {
    const itens: ItemCarrinho[] = [{ produtoId: 1, nome: 'A', preco: 10, quantidade: 2 }];
    gravarCarrinho(itens);
    expect(lerCarrinho()).toEqual(itens);
  });

  it('devolve lista vazia quando não há nada', () => {
    expect(lerCarrinho()).toEqual([]);
  });

  it('sobrevive a conteúdo corrompido', () => {
    // O localStorage é editável por quem abrir o DevTools; um JSON
    // inválido não pode derrubar a loja.
    localStorage.setItem('gestaopro_carrinho', '{isso não é json');
    expect(lerCarrinho()).toEqual([]);
  });

  it('descarta entradas malformadas', () => {
    localStorage.setItem(
      'gestaopro_carrinho',
      JSON.stringify([
        { produtoId: 1, nome: 'ok', preco: 10, quantidade: 1 },
        { produtoId: 'texto', nome: 'inválido', preco: 10, quantidade: 1 },
        { produtoId: 3, nome: 'quantidade zero', preco: 10, quantidade: 0 }
      ])
    );
    const itens = lerCarrinho();
    expect(itens).toHaveLength(1);
    expect(itens[0].nome).toBe('ok');
  });
});

describe('isolamento entre as duas sessões', () => {
  const doPainel: Sessao = {
    token: 'token-painel',
    usuario: { id: 1, nome: 'Lojista', usuario: 'admin', perfil: 'Administrador', ativo: true }
  };
  const daLoja: SessaoLoja = {
    token: 'token-cliente',
    cliente: { id: 9, nome: 'Cliente', email: 'c@ex.com', telefone: null, endereco: null }
  };

  it('guarda as duas ao mesmo tempo, em chaves diferentes', () => {
    gravarSessao(doPainel);
    gravarSessaoLoja(daLoja);
    expect(lerSessao()?.token).toBe('token-painel');
    expect(lerSessaoLoja()?.token).toBe('token-cliente');
  });

  it('sair da loja não desloga o lojista', () => {
    gravarSessao(doPainel);
    gravarSessaoLoja(daLoja);
    limparSessao('loja');
    expect(lerSessaoLoja()).toBeNull();
    expect(lerSessao()?.token).toBe('token-painel');
  });

  it('sair do painel não desloga o cliente', () => {
    gravarSessao(doPainel);
    gravarSessaoLoja(daLoja);
    limparSessao('painel');
    expect(lerSessao()).toBeNull();
    expect(lerSessaoLoja()?.token).toBe('token-cliente');
  });
});

describe('esquemaCheckout', () => {
  const valido = { enderecoEntrega: 'Rua A, 100', pagamento: 'pix' as const, parcelas: '1' };

  it('converte parcelas em número', () => {
    expect(esquemaCheckout.parse(valido).parcelas).toBe(1);
  });

  it('exige endereço de entrega', () => {
    expect(esquemaCheckout.safeParse({ ...valido, enderecoEntrega: '  ' }).success).toBe(false);
  });

  it('recusa forma de pagamento desconhecida', () => {
    expect(esquemaCheckout.safeParse({ ...valido, pagamento: 'cripto' }).success).toBe(false);
  });

  it('limita o parcelamento a 12', () => {
    expect(esquemaCheckout.safeParse({ ...valido, parcelas: '13' }).success).toBe(false);
    expect(esquemaCheckout.safeParse({ ...valido, parcelas: '12' }).success).toBe(true);
  });
});
