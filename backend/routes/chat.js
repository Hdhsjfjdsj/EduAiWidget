const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middleware/auth');

router.post('/', auth, chatController.chat);
router.get('/history', auth, chatController.history);
router.post('/clear', auth, chatController.clearHistory);

module.exports = router;


