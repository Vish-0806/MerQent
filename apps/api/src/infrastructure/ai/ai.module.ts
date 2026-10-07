import { Module } from '@nestjs/common';
import { AI_PROVIDER_TOKEN, IAiProvider, EmbeddingRequest, EmbeddingResponse, CompletionRequest, CompletionResponse } from './ai-provider.interface';

// Default mock/sandbox provider for Phase 1 architecture verification
class SandboxAiProvider implements IAiProvider {
  async generateEmbedding(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return {
      embedding: new Array(1536).fill(0),
      dimensions: 1536,
    };
  }

  async generateCompletion(_request: CompletionRequest): Promise<CompletionResponse> {
    return {
      content: JSON.stringify({
        overallScore: 88,
        confidenceBand: 'HIGH',
        strengths: ['Verified 8+ years SAP S/4HANA implementation lead experience in MedTech'],
        potentialGaps: ['Limited recent carve-out experience in cross-border jurisdictions'],
        evidenceQuotes: ['Led $50M revenue carve-out ERP cutover for Midwest Healthcare platform.'],
      }),
    };
  }
}

@Module({
  providers: [
    {
      provide: AI_PROVIDER_TOKEN,
      useClass: SandboxAiProvider,
    },
  ],
  exports: [AI_PROVIDER_TOKEN],
})
export class AiModule {}
