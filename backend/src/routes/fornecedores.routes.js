// ======================================
// ROTAS — FORNECEDORES
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/fornecedores.controller');
const { validar, validarQuery } = require('../middleware/validate');
const { paginacaoQuerySchema } = require('../utils/paginacao');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/', validarQuery(paginacaoQuerySchema), ctrl.listar);
router.get('/:id', ctrl.obter);
router.post('/', validar(ctrl.fornecedorSchema), ctrl.criar);
router.put('/:id', validar(ctrl.fornecedorSchema), ctrl.atualizar);
router.delete('/:id', ctrl.excluir);

module.exports = router;
