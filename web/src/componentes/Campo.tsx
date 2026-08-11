// ======================================
// CAMPOS DE FORMULÁRIO
// ======================================
// Rótulo, campo e mensagem de erro sempre juntos e ligados por id, para
// que o clique no rótulo foque o campo e o leitor de tela anuncie o erro.

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

const BASE =
  'w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none transition focus:border-marca disabled:opacity-60';

function Envolucro({
  id,
  rotulo,
  erro,
  children
}: {
  id: string;
  rotulo: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-texto-suave">
        {rotulo}
      </label>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-xs text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}

type PropsTexto = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  rotulo: string;
  erro?: string;
};

export function CampoTexto({ id, rotulo, erro, ...resto }: PropsTexto) {
  return (
    <Envolucro id={id} rotulo={rotulo} erro={erro}>
      <input
        id={id}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={BASE}
        {...resto}
      />
    </Envolucro>
  );
}

type PropsSelecao = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  rotulo: string;
  erro?: string;
  opcoes: { valor: string; rotulo: string }[];
};

export function CampoSelecao({ id, rotulo, erro, opcoes, ...resto }: PropsSelecao) {
  return (
    <Envolucro id={id} rotulo={rotulo} erro={erro}>
      <select id={id} aria-invalid={!!erro} className={BASE} {...resto}>
        {opcoes.map(opcao => (
          <option key={opcao.valor} value={opcao.valor}>
            {opcao.rotulo}
          </option>
        ))}
      </select>
    </Envolucro>
  );
}

type PropsArea = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  rotulo: string;
  erro?: string;
};

export function CampoArea({ id, rotulo, erro, ...resto }: PropsArea) {
  return (
    <Envolucro id={id} rotulo={rotulo} erro={erro}>
      <textarea id={id} rows={3} aria-invalid={!!erro} className={BASE} {...resto} />
    </Envolucro>
  );
}
