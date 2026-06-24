// ======================================
// AUTENTICAÇÃO — CLIENTES DA LOJA VIRTUAL
// ======================================
const { z } = require('zod');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { gerarHash, conferirSenha } = require('../utils/senha');
const { gerarTokenCliente } = require('../utils/jwt');

const vazioParaNulo = v => (v === '' || v === undefined ? null : v);

const registrarSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório.'),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  telefone: z.string().trim().optional().default(''),
  cpf: z.preprocess(vazioParaNulo, z.string().trim().nullable().optional()),
  endereco: z.string().trim().optional().default(''),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.')
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe a senha.')
});

function semSenha(cliente) {
  const { senhaHash, ...resto } = cliente; // eslint-disable-line no-unused-vars
  return resto;
}

const registrar = asyncHandler(async (req, res) => {
  const { nome, email, telefone, cpf, endereco, senha } = req.body;

  const existente = await prisma.cliente.findUnique({ where: { email } });

  // Caso comum: o lojista já cadastrou esse cliente manualmente no painel
  // (ex.: veio de uma venda por telefone). Em vez de barrar o cadastro
  // com "e-mail já existe", aproveitamos o registro e só adicionamos o
  // login da loja a ele.
  if (existente && existente.senhaHash) {
    throw ApiError.conflito('Este e-mail já tem uma conta na loja. Faça login.');
  }

  const senhaHash = await gerarHash(senha);

  const cliente = existente
    ? await prisma.cliente.update({
        where: { id: existente.id },
        data: { senhaHash, nome, telefone: telefone || existente.telefone, cpf: cpf ?? existente.cpf, endereco: endereco || existente.endereco }
      })
    : await prisma.cliente.create({
        data: { nome, email, telefone, cpf, endereco, senhaHash, origem: 'loja' }
      });

  const token = gerarTokenCliente(cliente);
  res.status(201).json({ token, cliente: semSenha(cliente) });
});

const login = asyncHandler(async (req, res) => {
  const { email, senha } = req.body;

  const cliente = await prisma.cliente.findUnique({ where: { email } });
  if (!cliente || !(await conferirSenha(senha, cliente.senhaHash))) {
    throw ApiError.naoAutorizado('E-mail ou senha incorretos.');
  }

  const token = gerarTokenCliente(cliente);
  res.json({ token, cliente: semSenha(cliente) });
});

const me = asyncHandler(async (req, res) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: req.cliente.id } });
  if (!cliente) throw ApiError.naoEncontrado('Cliente não encontrado.');
  res.json(semSenha(cliente));
});

module.exports = { registrarSchema, loginSchema, registrar, login, me };
