// ======================================
// MARCA
// ======================================
// Nome e símbolo do produto ficam só aqui. Antes o ⚙ e o texto estavam
// repetidos em quatro telas, então trocar a identidade significava
// caçar as ocorrências uma a uma.

export const NOME_PRODUTO = 'GestãoPro';
export const DESCRICAO_PRODUTO = 'ERP com loja virtual';

/**
 * O símbolo é desenhado à mão, não é um ícone de biblioteca: três
 * barras de altura crescente dentro de um recorte — leitura de
 * crescimento, que serve tanto ao painel quanto à loja.
 *
 * `currentColor` em tudo faz o símbolo herdar a cor de quem o usa, sem
 * precisar de variante por tema.
 */
export function Simbolo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      strokeLinecap="round"
    >
      <rect x="4" y="14" width="3.6" height="6" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="10.2" y="9.5" width="3.6" height="10.5" rx="1.2" fill="currentColor" opacity="0.8" />
      <rect x="16.4" y="4" width="3.6" height="16" rx="1.2" fill="currentColor" />
    </svg>
  );
}

type Props = {
  /** Só o símbolo, sem o nome ao lado. */
  compacta?: boolean;
  /** Descrição sob o nome — usada no cabeçalho móvel do login. */
  legenda?: boolean;
  className?: string;
};

export function Marca({ compacta = false, legenda = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marca text-sobre-marca">
        <Simbolo className="h-5 w-5" />
      </span>
      {!compacta && (
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight tracking-tight">{NOME_PRODUTO}</p>
          {legenda && (
            <p className="truncate text-xs text-texto-suave">{DESCRICAO_PRODUTO}</p>
          )}
        </div>
      )}
    </div>
  );
}
