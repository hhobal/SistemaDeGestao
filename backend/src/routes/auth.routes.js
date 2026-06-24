// ======================================
// ROTAS — AUTENTICAÇÃO (EQUIPE INTERNA)
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { validar } = require('../middleware/validate');
const { autenticarEVerificarAtivo } = require('../middleware/auth');

const router = Router();

router.post('/login', validar(ctrl.loginSchema), ctrl.login);
router.get('/me', autenticarEVerificarAtivo, ctrl.me);
router.put('/me', autenticarEVerificarAtivo, validar(ctrl.alterarSenhaSchema), ctrl.atualizarPerfil);
router.post('/logout', autenticarEVerificarAtivo, ctrl.logout);

module.exports = router;
