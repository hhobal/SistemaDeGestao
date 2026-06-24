// ======================================
// ROTAS — DASHBOARD
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/dashboard.controller');
const { autenticarEVerificarAtivo } = require('../middleware/auth');

const router = Router();

router.get('/', autenticarEVerificarAtivo, ctrl.obter);

module.exports = router;
