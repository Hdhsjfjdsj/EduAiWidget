const axios = require('axios');

// Accepts: prompt, models (array or string)
async function askLLM(prompt, models = 'openai') {
  // Normalize to array
  const modelList = Array.isArray(models) ? models : [models];
  let lastError = null;
  for (const model of modelList) {
    try {
      if (model === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );
        return { content: response.data.choices[0].message.content, modelUsed: model };
      }
      if (model === 'openrouter') {
        const apiKey = process.env.OPENROUTER_API_KEY;
        try {
          const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: 'openai/gpt-3.5-turbo',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 512,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            }
          );
          return { content: response.data.choices[0].message.content, modelUsed: model };
        } catch (err) {
          if (err.response && err.response.data) {
            console.error('OpenRouter error response:', err.response.data);
          }
          throw err;
        }
      }
      if (model === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;
        const geminiModel = 'gemini-1.5-pro-latest';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
        const response = await axios.post(
          url,
          {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }
        );
        if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts[0].text) {
          return { content: response.data.candidates[0].content.parts[0].text, modelUsed: model };
        } else if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts[0]) {
          return { content: response.data.candidates[0].content.parts[0], modelUsed: model };
        } else {
          throw new Error('Unexpected Gemini response structure: ' + JSON.stringify(response.data));
        }
      }
      if (model === 'deepseek') {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        const response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 512,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          }
        );
        return { content: response.data.choices[0].message.content, modelUsed: model };
      }
      // LM Studio fallback (local OpenAI-compatible API)
      if (model === 'lmstudio') {
        // LM Studio runs locally, no API key needed
        const lmstudioModel = process.env.LMSTUDIO_MODEL || 'llama-3-8b-instruct';
        try {
          const response = await axios.post(
            'http://localhost:1234/v1/chat/completions',
            {
              model: lmstudioModel,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 512,
            }
          );
          return { content: response.data.choices[0].message.content, modelUsed: model };
        } catch (err) {
          // If LM Studio is not running, treat as fallback failure
          if (err.code === 'ECONNREFUSED' || (err.response && (err.response.status === 429 || err.response.status === 402))) {
            lastError = err;
            continue;
          }
          throw err;
        }
      }
      // Ollama fallback (local OpenAI-compatible API)
      if (model === 'ollama') {
        // Ollama runs locally, no API key needed
        const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
        try {
          const response = await axios.post(
            'http://localhost:11434/v1/chat/completions',
            {
              model: ollamaModel,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 512,
            }
          );
          return { content: response.data.choices[0].message.content, modelUsed: model };
        } catch (err) {
          // If Ollama is not running, treat as fallback failure
          if (err.code === 'ECONNREFUSED' || (err.response && (err.response.status === 429 || err.response.status === 402))) {
            lastError = err;
            continue;
          }
          throw err;
        }
      }
      throw new Error('Model not supported');
    } catch (err) {
      // If rate limited or payment required, try next model
      if (err.response && (err.response.status === 429 || err.response.status === 402)) {
        lastError = err;
        continue;
      }
      // For other errors, throw immediately
      throw err;
    }
  }
  // If all models failed due to rate limit
  const error = new Error('All LLM providers are currently rate limited. Please try again later.');
  error.code = 'ALL_LLM_RATE_LIMITED';
  error.lastError = lastError;
  throw error;
}

module.exports = { askLLM };


