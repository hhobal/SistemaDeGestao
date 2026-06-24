// ======================================
// asyncHandler — encaminha erros async para o errorHandler
// ======================================
// Sem isso, toda rota async precisaria de try/catch manual
// para erros não tratados não derrubarem o processo.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
