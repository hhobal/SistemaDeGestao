// ======================================
// PRÉVIA DA LOJA
// ======================================
// Demonstração da loja dentro da tela de login, para quem chega ver o
// que o sistema faz antes de entrar.
//
// É marcação, não vídeo nem imagem. Um vídeo pesaria megabytes no
// primeiro carregamento, precisaria ser regravado a cada mudança de
// visual e apareceria borrado em tela grande. Isto aqui usa os mesmos
// tokens de cor do resto — quando o tema muda, a prévia muda junto — e
// custa alguns kilobytes de HTML.
//
// Os produtos são os mesmos que o seed cria, então a prévia mostra a
// loja que a pessoa vai encontrar de verdade ao clicar no link.

import { ShoppingBag, Star } from 'lucide-react';

const PRODUTOS = [
  { nome: 'SSD NVMe 1TB', categoria: 'Armazenamento', preco: '529,90', estoque: 12 },
  { nome: 'Teclado Mecânico RGB', categoria: 'Periféricos', preco: '289,90', estoque: 24 },
  { nome: 'Memória DDR4 16GB', categoria: 'Componentes', preco: '349,90', estoque: 15 },
  { nome: 'Headset com Microfone', categoria: 'Periféricos', preco: '219,00', estoque: 18 }
];

export function PreviaLoja() {
  return (
    // aria-hidden: é ilustração. Um leitor de tela lendo preços falsos
    // de produtos que não estão à venda aqui só atrapalharia.
    <div aria-hidden className="select-none">
      <div className="overflow-hidden rounded-xl border border-borda bg-fundo shadow-2xl shadow-black/30">
        {/* Barra da janela — dá a entender que é outra tela, não parte
            do formulário ao lado. */}
        <div className="flex items-center gap-2 border-b border-borda bg-superficie px-3 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-erro/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-aviso/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
          </span>
          <span className="ml-2 flex-1 truncate rounded-md bg-fundo px-2.5 py-1 text-[11px] text-texto-fraco">
            /loja
          </span>
        </div>

        {/* Cabeçalho da loja */}
        <div className="flex items-center gap-2 border-b border-borda px-3.5 py-2.5">
          <span className="text-[11px] font-semibold">Catálogo</span>
          <span className="flex-1" />
          <span className="flex items-center gap-1.5 rounded-md border border-borda px-2 py-1 text-[10px] text-texto-suave">
            <ShoppingBag size={11} strokeWidth={2} />
            Carrinho
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-marca text-[9px] font-bold text-sobre-marca">
              2
            </span>
          </span>
        </div>

        {/* Grade de produtos */}
        <div className="grid grid-cols-2 gap-2.5 p-3.5">
          {PRODUTOS.map(produto => (
            <div key={produto.nome} className="rounded-lg border border-borda bg-cartao p-2.5">
              {/* Espaço da foto: o degradê evita o retângulo cinza morto
                  que uma imagem ausente deixaria. */}
              <div className="mb-2 grid h-12 place-items-center rounded-md bg-gradient-to-br from-realce to-superficie">
                <Star size={13} strokeWidth={1.75} className="text-texto-fraco" />
              </div>
              <p className="truncate text-[11px] font-medium leading-tight">{produto.nome}</p>
              <p className="text-[9px] text-texto-fraco">{produto.categoria}</p>
              <div className="mt-1.5 flex items-end justify-between gap-1">
                <span className="text-[11px] font-bold text-marca">R$ {produto.preco}</span>
                <span className="text-[9px] text-ok">{produto.estoque} un.</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legenda: liga a prévia ao que acontece do lado de dentro. */}
      <p className="mt-4 text-center text-xs text-texto-fraco">
        A compra aqui baixa o estoque e lança no financeiro do painel — na
        mesma transação.
      </p>
    </div>
  );
}
