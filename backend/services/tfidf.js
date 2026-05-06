import { processText } from './tokenizer.js';

function countTermFrequency(tokens) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  const total = tokens.length || 1;
  for (const term in tf) {
    tf[term] = tf[term] / total;
  }
  return tf;
}

function buildVocabulary(documents) {
  const vocab = new Set();
  for (const doc of documents) {
    for (const term in doc.tf) {
      vocab.add(term);
    }
  }
  return Array.from(vocab);
}

function calculateIDF(documents, vocabulary) {
  const N = documents.length;
  const idf = {};

  for (const term of vocabulary) {
    let docCount = 0;
    for (const doc of documents) {
      if (doc.tf[term] && doc.tf[term] > 0) {
        docCount++;
      }
    }
    idf[term] = Math.log((N + 1) / (docCount + 1)) + 1;
  }

  return idf;
}

function computeTFIDFVector(tf, idf, vocabulary) {
  const vector = new Array(vocabulary.length);
  for (let i = 0; i < vocabulary.length; i++) {
    const term = vocabulary[i];
    vector[i] = (tf[term] || 0) * (idf[term] || 0);
  }
  return vector;
}

export class TFIDFCalculator {
  constructor() {
    this.documents = [];
    this.vocabulary = [];
    this.idf = {};
  }

  addDocument(id, text) {
    const tokens = processText(text);
    const tf = countTermFrequency(tokens);
    this.documents.push({ id, tokens, tf });
  }

  build() {
    this.vocabulary = buildVocabulary(this.documents);
    this.idf = calculateIDF(this.documents, this.vocabulary);

    for (const doc of this.documents) {
      doc.tfidf = computeTFIDFVector(doc.tf, this.idf, this.vocabulary);
    }
  }

  getVector(documentId) {
    const doc = this.documents.find(d => d.id === documentId);
    if (!doc) return null;
    return doc.tfidf;
  }

  getTopTerms(documentId, topN = 10) {
    const doc = this.documents.find(d => d.id === documentId);
    if (!doc) return [];

    const termsWithScore = [];
    for (const term in doc.tf) {
      const tfidf = (doc.tf[term] || 0) * (this.idf[term] || 0);
      termsWithScore.push({ term, score: tfidf });
    }

    termsWithScore.sort((a, b) => b.score - a.score);
    return termsWithScore.slice(0, topN);
  }
}

export function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB) return 0;
  if (vectorA.length !== vectorB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

export function calculateDocumentSimilarity(textA, textB) {
  const calculator = new TFIDFCalculator();
  calculator.addDocument('docA', textA);
  calculator.addDocument('docB', textB);
  calculator.build();

  const vectorA = calculator.getVector('docA');
  const vectorB = calculator.getVector('docB');

  return cosineSimilarity(vectorA, vectorB);
}

export function batchSimilarity(targetText, candidateTexts) {
  const calculator = new TFIDFCalculator();
  calculator.addDocument('target', targetText);

  for (let i = 0; i < candidateTexts.length; i++) {
    calculator.addDocument(`candidate_${i}`, candidateTexts[i]);
  }

  calculator.build();

  const targetVector = calculator.getVector('target');
  const results = [];

  for (let i = 0; i < candidateTexts.length; i++) {
    const candidateVector = calculator.getVector(`candidate_${i}`);
    const similarity = cosineSimilarity(targetVector, candidateVector);
    results.push({
      index: i,
      similarity: Math.round(similarity * 10000) / 100
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}
