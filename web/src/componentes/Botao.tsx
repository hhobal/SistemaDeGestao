import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'perigo';
};

const VARIANTES = {
  primario: 'bg-marca text-white hover:bg-marca-escura',
  secundario: 'border border-borda text-texto-suave hover:bg-realce hover:text-texto',
  perigo: 'bg-erro text-white hover:opacity-90'
} as const;

export function Botao({ variante = 'primario', className = '', ...resto }: Props) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
      {...resto}
    />
  );
}
