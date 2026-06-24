// ======================================
// ROTAS — RELATÓRIOS
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/relatorios.controller');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/faturamento-mensal', ctrl.faturamentoMensal);
router.get('/top-clientes', ctrl.topClientes);
router.get('/status-os', ctrl.statusOS);
router.get('/estoque-critico', ctrl.estoqueCritico);
router.get('/produtos-mais-vendidos', ctrl.produtosMaisVendidos);

module.exports = router;
