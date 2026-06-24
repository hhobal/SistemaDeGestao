// ======================================
// PAGINAÇÃO — schema de query e helpers
// ======================================
const { z } = require('zod');

const paginacaoQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
  busca: z.string().trim().optional().default('')
});

function paginar(query) {
  const pagina = query.pagina || 1;
  const porPagina = query.porPagina || 20;
  return { skip: (pagina - 1) * porPagina, take: porPagina, pagina, porPagina };
}

function respostaPaginada({ itens, total, pagina, porPagina }) {
  return {
    itens,
    paginacao: {
      total,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina))
    }
  };
}

module.exports = { paginacaoQuerySchema, paginar, respostaPaginada };
