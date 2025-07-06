const { Document, UrlSource, VectorEntry } = require('../models');
const fs = require('fs');
const { getEmbeddingWithFallback } = require('../utils/vectorizer');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const cheerio = require('cheerio');

const CHUNK_SIZE = 50; // words per chunk (even finer granularity)

function chunkText(text, chunkSize = CHUNK_SIZE) {
  // Split by whitespace, then join back into chunks
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  return chunks.filter(chunk => chunk.trim().length > 0);
}

async function extractTextFromFile(file) {
  if (file.mimetype === 'application/pdf') {
    const data = fs.readFileSync(file.path);
    const pdf = await pdfParse(data);
    return pdf.text;
  } else if (file.mimetype.startsWith('text/')) {
    return fs.readFileSync(file.path, 'utf8');
  }
  // Fallback: use originalname
  return file.originalname;
}

async function extractTextFromUrl(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  return $('body').text();
}

exports.uploadDocument = async (req, res) => {
  const { sequelize } = require('../models');
  const { file } = req;
  let transaction;
  try {
    if (!file) return res.status(400).json({ message: 'No file uploaded' });
    transaction = await sequelize.transaction();
    // Extract text
    const text = await extractTextFromFile(file);
    // Chunk the text
    const chunks = chunkText(text, CHUNK_SIZE);
    if (!chunks.length) throw new Error('No text chunks found in document.');
    // Only create Document if all above succeed
    const doc = await Document.create({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploaderId: req.user.id,
    }, { transaction });
    // For each chunk, embed and insert as a vector entry
    for (const chunk of chunks) {
      let embedding = await getEmbeddingWithFallback(chunk);
      if (Array.isArray(embedding)) embedding = embedding.map(Number);
      if (!embedding.length) throw new Error('Embedding is empty.');
      if (embedding.some(v => typeof v !== 'number' || isNaN(v))) throw new Error('Embedding contains non-numeric values.');
      const embeddingStr = `[${embedding.join(',')}]`;
      // Insert embedding as pgvector using raw query
      await VectorEntry.sequelize.query(
        'INSERT INTO "VectorEntries" ("documentId", "content", "embedding", "createdAt", "updatedAt") VALUES (?, ?, ?::vector, NOW(), NOW())',
        {
          replacements: [doc.id, chunk, embeddingStr],
          transaction,
        }
      );
    }
    await transaction.commit();
    res.status(201).json({ message: 'Document uploaded', document: doc, chunks: chunks.length });
  } catch (err) {
    if (transaction) await transaction.rollback();
    // Clean up uploaded file if it exists
    if (file && file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
    }
    console.error('Upload failed:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

exports.addUrlSource = async (req, res) => {
  const { sequelize } = require('../models');
  let transaction;
  try {
    const { url, title, description } = req.body;
    transaction = await sequelize.transaction();
    const urlSource = await UrlSource.create({
      url,
      title,
      description,
      addedBy: req.user.id,
    }, { transaction });
    // Scrape and extract text
    const text = await extractTextFromUrl(url);
    // Chunk the text
    const chunks = chunkText(text, CHUNK_SIZE);
    if (!chunks.length) throw new Error('No text chunks found in URL.');
    // For each chunk, embed and insert as a vector entry
    for (const chunk of chunks) {
      let embedding = await getEmbeddingWithFallback(chunk);
      if (Array.isArray(embedding)) embedding = embedding.map(Number);
      if (!embedding.length) throw new Error('Embedding is empty.');
      if (embedding.some(v => typeof v !== 'number' || isNaN(v))) throw new Error('Embedding contains non-numeric values.');
      const embeddingStr = `[${embedding.join(',')}]`;
      await VectorEntry.sequelize.query(
        'INSERT INTO "VectorEntries" ("urlSourceId", "content", "embedding", "createdAt", "updatedAt") VALUES (?, ?, ?::vector, NOW(), NOW())',
        {
          replacements: [urlSource.id, chunk, embeddingStr],
          transaction,
        }
      );
    }
    await transaction.commit();
    res.status(201).json({ message: 'URL source added', urlSource, chunks: chunks.length });
  } catch (err) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ message: 'Add URL failed', error: err.message });
  }
};

exports.listSources = async (req, res) => {
  const docs = await Document.findAll();
  const urls = await UrlSource.findAll();
  res.json({ documents: docs, urls });
};

exports.deleteSource = async (req, res) => {
  const { id } = req.params;
  await Document.destroy({ where: { id } });
  await UrlSource.destroy({ where: { id } });
  await VectorEntry.destroy({ where: { documentId: id } });
  await VectorEntry.destroy({ where: { urlSourceId: id } });
  res.json({ message: 'Source deleted' });
};
