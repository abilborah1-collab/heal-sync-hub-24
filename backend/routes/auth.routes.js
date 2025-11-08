const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLogger');

router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').isIn(['admin', 'doctor', 'patient'])
  ],
  logAudit('create', 'auth'),
  authController.register
);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  logAudit('login', 'auth'),
  authController.login
);

router.get('/me', protect, authController.getMe);

router.post('/logout', protect, logAudit('logout', 'auth'), authController.logout);

module.exports = router;
