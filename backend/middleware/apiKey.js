const { ApiKey } = require('../models');

module.exports = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey) {
    return res.status(401).json({ message: 'API key required' });
  }
  const key = await ApiKey.findOne({ where: { key: apiKey, active: true } });
  if (!key) {
    return res.status(403).json({ message: 'Invalid or inactive API key' });
  }
  req.apiKey = key;
  next();
}; 