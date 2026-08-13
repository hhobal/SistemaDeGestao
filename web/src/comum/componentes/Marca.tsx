// ======================================
// MARCA
// ======================================
// Nome e símbolo do produto ficam só aqui. Antes o ícone e o texto
// estavam repetidos em quatro telas, então trocar a identidade
// significava caçar as ocorrências uma a uma.

export const NOME_PRODUTO = 'GESTIQ';
export const DESCRICAO_PRODUTO = 'ERP com loja virtual';

/**
 * O símbolo é a letra Q — a que distingue o nome — desenhada como anel
 * com cauda, e dentro dela três barras crescentes: gestão medida.
 *
 * É SVG desenhado à mão, não um ícone de biblioteca, porque marca não
 * pode ser um símbolo que qualquer outro produto também usa. Tudo em
 * `currentColor`, então herda a cor de quem o aplica e não precisa de
 * variante por tema.
 *
 * A geometria foi conferida para o traço não vazar: as barras cabem
 * dentro do anel (a mais alta fica a 5.1 do centro, contra raio 7.4) e
 * a cauda começa dentro e cruza o anel na diagonal, que é o que faz o
 * O virar Q.
 */
export function Simbolo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle
        cx="12"
        cy="12"
        r="7.4"
        stroke="currentColor"
        strokeWidth="1.9"
        opacity="0.45"
      />
      <rect x="8.2" y="12.6" width="1.9" height="3.2" rx="0.95" fill="currentColor" />
      <rect x="11.05" y="10.6" width="1.9" height="5.2" rx="0.95" fill="currentColor" />
      <rect x="13.9" y="8.6" width="1.9" height="7.2" rx="0.95" fill="currentColor" />
      <path
        d="M16.4 16.4 L20.2 20.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
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
        <Simbolo className="h-6 w-6" />
      </span>
      {!compacta && (
        <div className="min-w-0">
          {/* O nome é uma sigla: o espaçamento entre letras evita que ela
              vire um bloco só, que é como sigla curta costuma falhar. */}
          <p className="truncate font-bold leading-tight tracking-[0.12em]">{NOME_PRODUTO}</p>
          {legenda && (
            <p className="truncate text-xs tracking-normal text-texto-suave">
              {DESCRICAO_PRODUTO}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
