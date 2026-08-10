// ======================================
// ROTAS — AUTENTICAÇÃO (EQUIPE INTERNA)
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { validar } = require('../middleware/validate');
const { autenticarEVerificarAtivo } = require('../middleware/auth');
const { limitarLogin } = require('../middleware/rateLimit');

const router = Router();

// O limitador vem antes da validação: tentativas com corpo inválido
// também consomem cota, senão bastaria mandar lixo para não ser contado.
router.post('/login', limitarLogin, validar(ctrl.loginSchema), ctrl.login);
router.get('/me', autenticarEVerificarAtivo, ctrl.me);
router.put('/me', autenticarEVerificarAtivo, validar(ctrl.alterarSenhaSchema), ctrl.atualizarPerfil);
router.post('/logout', autenticarEVerificarAtivo, ctrl.logout);

module.exports = router;
