// ======================================
// ROTAS — LOJA VIRTUAL (cliente final)
// ======================================
const { Router } = require('express');
const authCtrl = require('../controllers/lojaAuth.controller');
const produtosCtrl = require('../controllers/produtos.controller');
const pedidosCtrl = require('../controllers/pedidos.controller');
const { validar } = require('../middleware/validate');
const { autenticarCliente } = require('../middleware/auth');

const router = Router();

// ─── CATÁLOGO (público, sem login) ──────────────────────
router.get('/produtos', produtosCtrl.listarPublico);
router.get('/produtos/categorias', produtosCtrl.listarCategorias);

// ─── CONTA DO CLIENTE ────────────────────────────────────
router.post('/auth/registrar', validar(authCtrl.registrarSchema), authCtrl.registrar);
router.post('/auth/login', validar(authCtrl.loginSchema), authCtrl.login);
router.get('/auth/me', autenticarCliente, authCtrl.me);

// ─── PEDIDOS (requer login do cliente) ──────────────────
router.post('/pedidos', autenticarCliente, validar(pedidosCtrl.criarPedidoSchema), pedidosCtrl.criarPedidoLoja);
router.get('/pedidos', autenticarCliente, pedidosCtrl.meusPedidos);

module.exports = router;
