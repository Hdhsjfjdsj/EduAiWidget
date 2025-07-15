const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.post('/', auth, chatController.chat);
router.get('/history', auth, chatController.history);
router.post('/clear', auth, chatController.clearHistory);
router.post('/session', auth, chatController.createSession);
router.get('/sessions', auth, chatController.listSessions);
router.delete('/session/:id', auth, chatController.deleteSession);

module.exports = router;


