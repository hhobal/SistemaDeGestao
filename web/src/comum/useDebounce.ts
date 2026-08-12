import { useEffect, useState } from 'react';

/**
 * Atrasa a propagação de um valor que muda muito rápido.
 *
 * Sem isto, cada tecla digitada na busca dispara uma requisição: dez
 * letras viram dez chamadas, e a resposta da primeira pode chegar
 * depois da última e sobrescrever a lista com um resultado velho.
 */
export function useDebounce<T>(valor: T, milissegundos = 350) {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), milissegundos);
    // Cada digitação cancela o temporizador anterior: só o último
    // valor, depois da pausa, chega a ser publicado.
    return () => clearTimeout(id);
  }, [valor, milissegundos]);

  return atrasado;
}
