export interface EmbeddingRequest {
  text: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  dimensions: number;
}

export interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  responseFormat?: 'json' | 'text';
}

export interface CompletionResponse {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const AI_PROVIDER_TOKEN = 'IAiProvider';

export interface IAiProvider {
  generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  generateCompletion(request: CompletionRequest): Promise<CompletionResponse>;
}
