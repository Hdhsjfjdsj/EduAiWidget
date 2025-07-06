const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledgeController');
const auth = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/upload', auth, upload.single('file'), knowledgeController.uploadDocument);
router.post('/url', auth, knowledgeController.addUrlSource);
router.get('/list', auth, knowledgeController.listSources);
router.delete('/:id', auth, knowledgeController.deleteSource);
router.get('/status', (req, res) => res.json({ status: 'ok' }));

module.exports = router;


