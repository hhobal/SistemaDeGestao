// ======================================
// ROTAS — NOTAS
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/notas.controller');
const { validar } = require('../middleware/validate');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/', ctrl.listar);
router.post('/', validar(ctrl.notaSchema), ctrl.criar);
router.put('/:id', validar(ctrl.notaSchema), ctrl.atualizar);
router.delete('/:id', ctrl.excluir);

module.exports = router;
