// ======================================
// VALIDAÇÃO DE REQUISIÇÕES COM ZOD
// ======================================
// Uso: router.post('/', validar(schema), controller.criar)
// Se os dados não baterem com o schema, o erro vai direto pro
// errorHandler central (que devolve 400 com os campos problemáticos).
function validar(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      return next(resultado.error); // err.name === 'ZodError'
    }
    req.body = resultado.data; // dados já normalizados (trim, coerção de tipos etc.)
    next();
  };
}

function validarQuery(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.query);
    if (!resultado.success) {
      return next(resultado.error);
    }
    req.query = resultado.data;
    next();
  };
}

module.exports = { validar, validarQuery };
