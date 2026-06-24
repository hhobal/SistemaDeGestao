// ======================================
// ApiError — erro padronizado para respostas HTTP
// ======================================
class ApiError extends Error {
  constructor(status, mensagem, detalhes = undefined) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }

  static badRequest(mensagem, detalhes) { return new ApiError(400, mensagem, detalhes); }
  static naoAutorizado(mensagem = 'Não autenticado.') { return new ApiError(401, mensagem); }
  static proibido(mensagem = 'Você não tem permissão para esta ação.') { return new ApiError(403, mensagem); }
  static naoEncontrado(mensagem = 'Registro não encontrado.') { return new ApiError(404, mensagem); }
  static conflito(mensagem) { return new ApiError(409, mensagem); }
}

module.exports = ApiError;
