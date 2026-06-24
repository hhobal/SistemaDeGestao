// ======================================
// JWT — geração e verificação de tokens
// ======================================
// Dois segredos diferentes (JWT_SECRET / JWT_LOJA_SECRET) mantêm o
// login da equipe interna e o login dos clientes da loja em "mundos"
// separados: um token de cliente nunca pode ser usado para acessar
// rotas administrativas, mesmo que alguém tente forçar.
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function gerarTokenUsuario(usuario) {
  return jwt.sign(
    { id: usuario.id, perfil: usuario.perfil, tipo: 'usuario' },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verificarTokenUsuario(token) {
  return jwt.verify(token, env.jwtSecret);
}

function gerarTokenCliente(cliente) {
  return jwt.sign(
    { id: cliente.id, tipo: 'cliente' },
    env.jwtLojaSecret,
    { expiresIn: env.jwtLojaExpiresIn }
  );
}

function verificarTokenCliente(token) {
  return jwt.verify(token, env.jwtLojaSecret);
}

module.exports = {
  gerarTokenUsuario,
  verificarTokenUsuario,
  gerarTokenCliente,
  verificarTokenCliente
};
