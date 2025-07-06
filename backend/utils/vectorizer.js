const axios = require('axios');

async function getEmbedding(text, model = 'openai') {
  if (model === 'openai') {
    // Example using OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-ada-002',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.data[0].embedding;
  }
  if (model === 'openrouter') {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const response = await axios.post(
      'https://openrouter.ai/api/v1/embeddings',
      {
        input: text,
        model: 'openai/text-embedding-ada-002',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.data[0].embedding;
  }
  if (model === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=' + apiKey,
      {
        content: { parts: [{ text }] },
      }
    );
    return response.data.embedding.values;
  }
  if (model === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const response = await axios.post(
      'https://api.deepseek.com/v1/embeddings',
      {
        input: text,
        model: 'deepseek-embedding',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.data[0].embedding;
  }
  throw new Error('Model not supported');
}

// New: Fallback logic for embeddings
async function getEmbeddingWithFallback(text, preferredProviders = ['openai', 'gemini']) {
  // Debug: print if GEMINI_API_KEY is set
  console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
  const supportedProviders = ['openai', 'gemini'];
  const availableProviders = preferredProviders.filter(provider => {
    if (!supportedProviders.includes(provider)) {
      console.warn(`[Embedding Fallback] Provider '${provider}' does not support embeddings and will be skipped.`);
      return false;
    }
    if (provider === 'openai') return !!process.env.OPENAI_API_KEY;
    if (provider === 'gemini') return !!process.env.GEMINI_API_KEY;
    return false;
  });
  // Debug: print available providers
  console.log('Available embedding providers:', availableProviders);

  let lastError;
  for (const provider of availableProviders) {
    try {
      const result = await getEmbedding(text, provider);
      console.log(`[Embedding Fallback] Provider '${provider}' succeeded`);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[Embedding Fallback] Provider '${provider}' failed:`, err);
    }
  }
  console.error(`[Embedding Fallback] All providers failed. Last error: ${lastError ? lastError.message : 'No providers available'}`);
  throw lastError || new Error('No embedding providers available');
}

module.exports = { getEmbedding, getEmbeddingWithFallback };


