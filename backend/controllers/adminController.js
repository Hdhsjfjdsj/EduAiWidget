const { User, ChatLog, ApiKey } = require('../models');
const fs = require('fs');
const path = require('path');
const CONFIG_PATH = path.join(__dirname, '../config/botConfig.json');

exports.listUsers = async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ['password'] } });
  res.json(users);
};

exports.listChatLogs = async (req, res) => {
  const logs = await ChatLog.findAll({
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: User,
        attributes: ['name'],
      },
    ],
  });
  res.json(logs);
};

exports.listApiKeys = async (req, res) => {
  const keys = await ApiKey.findAll();
  res.json(keys);
};

exports.createApiKey = async (req, res) => {
  const { key, description } = req.body;
  const apiKey = await ApiKey.create({ key, description, active: true });
  res.status(201).json(apiKey);
};

exports.updateApiKey = async (req, res) => {
  const { id } = req.params;
  const { active, description } = req.body;
  const apiKey = await ApiKey.findByPk(id);
  if (!apiKey) return res.status(404).json({ message: 'API key not found' });
  apiKey.active = active !== undefined ? active : apiKey.active;
  apiKey.description = description || apiKey.description;
  await apiKey.save();
  res.json(apiKey);
};

exports.deleteApiKey = async (req, res) => {
  const { id } = req.params;
  await ApiKey.destroy({ where: { id } });
  res.json({ message: 'API key deleted' });
};

exports.getConfig = (req, res) => {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ rejectionMessage: 'Sorry, I can only answer questions related to this domain.', model: 'openai' }, null, 2));
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH));
  res.json(config);
};

exports.updateConfig = (req, res) => {
  const config = req.body;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  res.json({ message: 'Config updated', config });
}; 