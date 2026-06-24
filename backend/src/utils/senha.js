// ======================================
// SENHA — hash e verificação com bcrypt
// ======================================
// Corrige a falha de segurança mais grave da versão anterior: lá, a
// senha de usuários e clientes ficava salva em texto puro dentro do
// localStorage do navegador, visível para qualquer pessoa que abrisse
// o DevTools. Aqui, só o hash (irreversível) é armazenado no banco.
const bcrypt = require('bcryptjs');

const CUSTO_HASH = 10; // padrão recomendado; aumentar deixa o login mais lento

async function gerarHash(senhaPura) {
  return bcrypt.hash(senhaPura, CUSTO_HASH);
}

async function conferirSenha(senhaPura, hash) {
  if (!hash) return false;
  return bcrypt.compare(senhaPura, hash);
}

module.exports = { gerarHash, conferirSenha };
