// ======================================
// ROTAS — TAREFAS
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/tarefas.controller');
const { validar } = require('../middleware/validate');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/', ctrl.listar);
router.post('/', validar(ctrl.tarefaSchema), ctrl.criar);
router.put('/:id', validar(ctrl.tarefaSchema), ctrl.atualizar);
router.patch('/:id/status', validar(ctrl.alterarStatusSchema), ctrl.alterarStatus);
router.delete('/:id', ctrl.excluir);

module.exports = router;
