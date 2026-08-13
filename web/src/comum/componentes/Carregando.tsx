// Espera enquanto o pedaço da tela é baixado. Aparece dentro da casca
// já renderizada — o menu e o topo continuam na tela —, então a troca
// de página não pisca a interface inteira.
export function Carregando() {
  return (
    <div role="status" aria-live="polite" className="grid place-items-center py-20">
      <span className="sr-only">Carregando</span>
      <span
        aria-hidden
        className="h-6 w-6 animate-spin rounded-full border-2 border-borda border-t-marca"
      />
    </div>
  );
}
