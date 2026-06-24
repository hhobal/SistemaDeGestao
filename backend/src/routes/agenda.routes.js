// ======================================
// ROTAS — AGENDA
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/agenda.controller');
const { validar } = require('../middleware/validate');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obter);
router.post('/', validar(ctrl.eventoSchema), ctrl.criar);
router.put('/:id', validar(ctrl.eventoSchema), ctrl.atualizar);
router.delete('/:id', ctrl.excluir);

module.exports = router;
