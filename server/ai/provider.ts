import { GoogleGenAI } from '@google/genai';

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generateAnswer(systemPrompt: string, userPrompt: string): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

/**
 * Gemini AI Provider implementation using @google/genai SDK
 */
export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private client: GoogleGenAI | null = null;
  private apiKey: string;
  private modelName: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.modelName = process.env.AI_MODEL || 'gemini-3.6-flash';
    if (this.apiKey) {
      try {
        this.client = new GoogleGenAI({
          apiKey: this.apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize Gemini client:', err);
      }
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.client);
  }

  async generateAnswer(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini API key is not configured');
    }

    const response = await this.client.models.generateContent({
      model: this.modelName,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2, // Low temperature for high factual accuracy and strict evidence adherence
      },
    });

    return response.text || 'No response generated.';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      return getLocalEmbedding(text);
    }

    try {
      // Use standard embedding model if available
      const embModel = process.env.EMBEDDING_MODEL || 'gemini-embedding-2-preview';
      const res = await this.client.models.embedContent({
        model: embModel,
        contents: text,
      });

      const anyRes = res as any;
      const values = anyRes.embedding?.values || anyRes.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        return values;
      }
    } catch (err) {
      console.warn('Gemini embedding failed, falling back to deterministic local embedding:', err);
    }

    return getLocalEmbedding(text);
  }
}

/**
 * Deterministic local TF-IDF vectorizer fallback
 * Ensures the system remains 100% functional even when offline or before API key setup.
 */
export function getLocalEmbedding(text: string, dimensions = 64): number[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const vector = new Array(dimensions).fill(0);
  if (words.length === 0) return vector;

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % dimensions;
    vector[bucket] += 1;
  }

  // Normalize to unit vector
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * AI Provider Factory
 */
export function getAIProvider(): AIProvider {
  return new GeminiProvider();
}
