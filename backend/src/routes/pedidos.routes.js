// ======================================
// ROTAS — PEDIDOS (PAINEL ADMINISTRATIVO)
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/pedidos.controller');
const { validar, validarQuery } = require('../middleware/validate');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/resumo', ctrl.resumo);
router.get('/', validarQuery(ctrl.listarQuerySchema), ctrl.listar);
router.get('/:id', ctrl.obter);
router.patch('/:id/status', validar(ctrl.alterarStatusSchema), ctrl.alterarStatus);
router.delete('/:id', ctrl.excluir);

module.exports = router;
