const { ChatLog, VectorEntry, ChatSession } = require('../models');
const { askLLM } = require('../utils/llmClient');
const { getEmbeddingWithFallback } = require('../utils/vectorizer');
const fs = require('fs');
const path = require('path');
const CONFIG_PATH = path.join(__dirname, '../config/botConfig.json');

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ rejectionMessage: 'Sorry, I can only answer questions related to this domain.', model: 'openai' }, null, 2));
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH));
}

exports.chat = async (req, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user.id;
  const config = getConfig();
  const model = config.model || 'openai';
  const embeddingProviders = config.embeddingProviders || ['openrouter', 'deepseek', 'gemini', 'openai'];
  console.log('--- Incoming Chat Request ---');
  console.log('User ID:', userId);
  console.log('Session ID:', sessionId);
  console.log('User Message:', message);
  console.log('Model:', model);
  console.log('Embedding Providers:', embeddingProviders);
  // 1. Embed the user message
  let embedding;
  try {
    embedding = await getEmbeddingWithFallback(message, embeddingProviders);
    console.log('Query Embedding (first 5 values):', embedding.slice(0, 5));
  } catch (err) {
    console.error('Embedding failed:', err);
    return res.status(500).json({ message: 'Embedding failed', error: err.message });
  }
  // 2. Find relevant vectors (top 3)
  const results = await VectorEntry.sequelize.query(
    `SELECT *, embedding <#> CAST(:embedding AS vector) AS distance FROM "VectorEntries" ORDER BY distance ASC LIMIT 3`,
    { replacements: { embedding: `[${embedding.join(',')}]` }, model: VectorEntry, mapToModel: true }
  );
  console.log('Vector search results count:', results.length);
  if (results.length) {
    results.forEach((r, i) => {
      console.log(`#${i+1}: Distance=${r.distance}\nContent: ${r.content.slice(0, 200)}...`);
    });
  }
  if (!results.length || results[0].distance > 0.7) {
    // Out-of-scope
    const response = (config.rejectionMessage || 'Sorry, I can only answer questions related to this domain.').trim();
    console.log('No relevant context found or distance too high. Returning ONLY rejection message.');
    await ChatLog.create({ userId, message, response, modelUsed: model, sessionId });
    return res.json({ response, relatedQuestions: [] });
  }
  // 3. Build context from relevant entries
  const context = results.map(r => r.content).join('\n');
  console.log('Context sent to LLM:', context.slice(0, 500));
  // 4. Ask LLM
  const prompt = `Context:\n${context}\n\nYou are an AI assistant. Answer the user's question ONLY using the information provided in the context above. If the answer is not present in the context, reply: \"${config.rejectionMessage || 'Sorry, I can only answer questions related to this domain.'}\".\n\nUser: ${message}\nAI:`;
  console.log('Prompt to LLM:', prompt.slice(0, 500));
  let response;
  let modelUsed;
  // Preferred model order: use config.model (array or string)
  let preferredModels;
  if (Array.isArray(model)) {
    preferredModels = model;
  } else {
    const allModels = ['openai', 'gemini', 'deepseek', 'ollama'];
    preferredModels = [model, ...allModels.filter(m => m !== model)];
  }
  try {
    const llmResult = await askLLM(prompt, preferredModels);
    
    let rawResponse = llmResult.content.trim();
    rawResponse = rawResponse.replace(/^(According to the context|Based on the context|From the context|According to context|Based on context|From context|According to the text|As per the context|As per context|Per the context|Per context|According to the provided context|Based on the provided context|From the provided context|According to provided context|Based on provided context|From provided context)[,:\s-]+/i, '');
    const rejection = (config.rejectionMessage || 'Sorry, I can only answer questions related to this domain.').trim();
    const index = rawResponse.indexOf(rejection);
    if (index !== -1) {
      response = rejection;
    } else {
    response = rawResponse;
    }
    modelUsed = llmResult.modelUsed;
    console.log('LLM Response:', response);
  } catch (err) {
    console.error('LLM failed:', err);
    if (err.code === 'ALL_LLM_RATE_LIMITED') {
      return res.status(503).json({ message: 'All AI models are currently busy. Please try again in a few seconds.' });
    }
    return res.status(500).json({ message: 'LLM failed', error: err.message });
  }
  // 5. Generate related questions (stub)
  const relatedQuestions = [];
  await ChatLog.create({ userId, message, response, modelUsed, sessionId });
  res.json({ response, relatedQuestions });
};

exports.history = async (req, res) => {
  const userId = req.user.id;
  const { sessionId } = req.query;
  let where = { userId };
  if (sessionId) where.sessionId = sessionId;
  const logs = await ChatLog.findAll({ where, order: [['createdAt', 'ASC']] });
  res.json(logs);
};

exports.clearHistory = async (req, res) => {
  const userId = req.user.id;
  await ChatLog.destroy({ where: { userId } });
  res.json({ message: 'Chat history cleared' });
};

// --- Chat Session Management ---
exports.createSession = async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Session name required' });
  const session = await ChatSession.create({ userId, name });
  res.status(201).json(session);
};

exports.listSessions = async (req, res) => {
  const userId = req.user.id;
  const sessions = await ChatSession.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
  res.json(sessions);
};

exports.deleteSession = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const session = await ChatSession.findOne({ where: { id, userId } });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  // Delete all chat logs for this session
  await ChatLog.destroy({ where: { sessionId: id, userId } });
  await session.destroy();
  res.json({ message: 'Session deleted' });
};
