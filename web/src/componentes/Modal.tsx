// ======================================
// MODAL
// ======================================
// Usa o <dialog> nativo: ele já entrega fechamento por Esc, foco preso
// dentro da caixa e leitura correta por leitor de tela. O painel antigo
// tinha 80 modais montados com div e display:none, sem nada disso.

import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
};

export function Modal({ aberto, titulo, aoFechar, children, rodape }: Props) {
  const referencia = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;

    // showModal() é o que ativa o comportamento nativo; trocar um
    // atributo `open` não prende o foco nem escurece o fundo.
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  return (
    <dialog
      ref={referencia}
      // O Esc do navegador dispara 'cancel'; sem interceptar, o React
      // continuaria achando que o modal está aberto.
      onCancel={evento => {
        evento.preventDefault();
        aoFechar();
      }}
      onClick={evento => {
        // Clique no ::backdrop chega no próprio <dialog>, não no conteúdo.
        if (evento.target === referencia.current) aoFechar();
      }}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-borda bg-cartao p-0 text-texto backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between border-b border-borda px-5 py-3">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="grid h-7 w-7 place-items-center rounded text-texto-suave transition hover:bg-realce hover:text-texto"
        >
          ✕
        </button>
      </div>

      <div className="px-5 py-4">{children}</div>

      {rodape && (
        <div className="flex justify-end gap-2 border-t border-borda px-5 py-3">{rodape}</div>
      )}
    </dialog>
  );
}
