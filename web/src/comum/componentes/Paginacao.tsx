type Props = {
  pagina: number;
  totalPaginas: number;
  total: number;
  aoMudar: (pagina: number) => void;
};

export function Paginacao({ pagina, totalPaginas, total, aoMudar }: Props) {
  if (totalPaginas <= 1) {
    return (
      <div className="px-4 py-3 text-xs text-texto-fraco">
        {total} {total === 1 ? 'registro' : 'registros'}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-texto-fraco">
        Página {pagina} de {totalPaginas} · {total} registros
      </span>

      <div className="flex gap-1">
        <button
          onClick={() => aoMudar(pagina - 1)}
          disabled={pagina <= 1}
          className="rounded border border-borda px-3 py-1 text-xs text-texto-suave transition hover:bg-realce disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          onClick={() => aoMudar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="rounded border border-borda px-3 py-1 text-xs text-texto-suave transition hover:bg-realce disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
