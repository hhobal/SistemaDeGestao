// ======================================
// ROTAS — BACKUP
// ======================================
const { Router } = require('express');
const ctrl = require('../controllers/backup.controller');
const { autenticarEVerificarAtivo, requerPerfil } = require('../middleware/auth');

const router = Router();

router.use(autenticarEVerificarAtivo, requerPerfil('Administrador'));

router.get('/', ctrl.exportar);
router.post('/importar', ctrl.importar);

module.exports = router;
