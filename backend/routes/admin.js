const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Admin check middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
};

router.get('/users', auth, isAdmin, adminController.listUsers);
router.get('/chatlogs', auth, isAdmin, adminController.listChatLogs);
router.get('/apikeys', auth, isAdmin, adminController.listApiKeys);
router.post('/apikeys', auth, isAdmin, adminController.createApiKey);
router.patch('/apikeys/:id', auth, isAdmin, adminController.updateApiKey);
router.delete('/apikeys/:id', auth, isAdmin, adminController.deleteApiKey);
router.get('/config', auth, isAdmin, adminController.getConfig);
router.post('/config', auth, isAdmin, adminController.updateConfig);

module.exports = router; 