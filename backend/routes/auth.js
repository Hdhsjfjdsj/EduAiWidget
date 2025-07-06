const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', auth, authController.me);
router.get('/status', (req, res) => res.json({ status: 'ok' }));

module.exports = router;


