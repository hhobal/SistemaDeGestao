// ======================================
// ROTAS — ESTOQUE
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/estoque.controller');
const { validar, validarQuery } = require('../middleware/validate');
const { paginacaoQuerySchema } = require('../utils/paginacao');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/resumo', ctrl.resumo);
router.get('/criticos', ctrl.criticos);
router.get('/movimentos', validarQuery(paginacaoQuerySchema), ctrl.listarMovimentos);
router.post('/movimentos', validar(ctrl.movimentoSchema), ctrl.criarMovimento);

module.exports = router;
