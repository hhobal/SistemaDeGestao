// ======================================
// ROTAS — PRODUTOS (PAINEL ADMINISTRATIVO)
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/produtos.controller');
const { validar, validarQuery } = require('../middleware/validate');
const { autenticarEVerificarAtivo, bloquearVisitanteEmEscrita } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, bloquearVisitanteEmEscrita);

router.get('/categorias', ctrl.listarCategorias);
router.get('/', validarQuery(ctrl.listarQuerySchema), ctrl.listar);
router.get('/:id', ctrl.obter);
router.post('/', validar(ctrl.produtoSchema), ctrl.criar);
router.put('/:id', validar(ctrl.produtoSchema), ctrl.atualizar);
router.delete('/:id', ctrl.excluir);

module.exports = router;
