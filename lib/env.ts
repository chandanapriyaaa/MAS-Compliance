/**
 * Centralised environment access.
 *
 * Server-only secrets are read lazily so that importing a module that
 * transitively touches this file does not crash at build time when a var is
 * absent. Call the getters at request time, not module top-level.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Groq
  groqApiKey: () => required("GROQ_API_KEY"),
  groqModel: () => optional("GROQ_MODEL", "llama-3.3-70b-versatile"),

  // Supabase (server)
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseAnonKey: () => required("SUPABASE_ANON_KEY"),

  // Upstash Redis
  redisUrl: () => required("UPSTASH_REDIS_REST_URL"),
  redisToken: () => required("UPSTASH_REDIS_REST_TOKEN"),

  // QStash
  qstashToken: () => required("QSTASH_TOKEN"),
  qstashCurrentSigningKey: () => required("QSTASH_CURRENT_SIGNING_KEY"),
  qstashNextSigningKey: () => required("QSTASH_NEXT_SIGNING_KEY"),

  // App config
  appBaseUrl: () => optional("APP_BASE_URL", "http://localhost:3000"),
  confidenceThreshold: () => {
    const raw = optional("CONFIDENCE_THRESHOLD", "0.85");
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0.85;
  },

  // Embeddings (RAG)
  embeddingProvider: () => optional("EMBEDDING_PROVIDER", ""),
  embeddingApiKey: () => optional("EMBEDDING_API_KEY", ""),
  embeddingModel: () => optional("EMBEDDING_MODEL", ""),
};
