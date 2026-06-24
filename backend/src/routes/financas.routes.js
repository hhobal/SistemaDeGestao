// ======================================
// ROTAS — FINANÇAS
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/financas.controller');
const { validar, validarQuery } = require('../middleware/validate');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/resumo', validarQuery(ctrl.filtroQuerySchema), ctrl.resumo);
router.get('/mensal', ctrl.mensal);
router.get('/lancamentos', validarQuery(ctrl.filtroQuerySchema), ctrl.listar);
router.get('/lancamentos/:id', ctrl.obter);
router.post('/lancamentos', validar(ctrl.lancamentoSchema), ctrl.criar);
router.put('/lancamentos/:id', validar(ctrl.lancamentoSchema), ctrl.atualizar);
router.patch('/lancamentos/:id/status', validar(ctrl.alterarStatusSchema), ctrl.alterarStatus);
router.delete('/lancamentos/:id', ctrl.excluir);

module.exports = router;
