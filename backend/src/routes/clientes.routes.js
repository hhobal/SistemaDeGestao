// ======================================
// ROTAS — CLIENTES
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/clientes.controller');
const { validar, validarQuery } = require('../middleware/validate');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/', validarQuery(ctrl.listarQuerySchema), ctrl.listar);
router.get('/:id', ctrl.obter);
router.post('/', validar(ctrl.clienteSchema), ctrl.criar);
router.put('/:id', validar(ctrl.clienteSchema), ctrl.atualizar);
router.delete('/:id', ctrl.excluir);

module.exports = router;
