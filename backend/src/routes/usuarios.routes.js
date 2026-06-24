// ======================================
// ROTAS — USUÁRIOS DO SISTEMA
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/usuarios.controller');
const { validar } = require('../middleware/validate');
const { autenticarEVerificarAtivo, requerPerfil } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, requerPerfil('Administrador'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obter);
router.post('/', validar(ctrl.criarSchema), ctrl.criar);
router.put('/:id', validar(ctrl.atualizarSchema), ctrl.atualizar);
router.delete('/:id', ctrl.excluir);

module.exports = router;
