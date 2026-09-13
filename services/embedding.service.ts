import { DocumentChunk } from "@/types/chunk";
import { EmbeddedChunk } from "@/types/embedding";
import { InferenceClient } from "@huggingface/inference";

const hf = new InferenceClient(process.env.HF_API_TOKEN);

export class EmbedChunks {
  private count = 0;

  private async fetchEmbeddings(text: string[]): Promise<number[][]> {
    console.log(`sending req count : ${++this.count}`);

    const response = await hf.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: text,
    });

    if (!response) {
      throw new Error(`HF API ERROR WHILE CALLING`);
      // const errorBody = await response.text();
      // throw new Error(`HF API error status : ${response.status} : ${errorBody}`);
    }

    const embeddings = response as number[][];

    return embeddings;
  }

  async embedChunks(
    chunks: DocumentChunk[],
    batchSize: number = 32,
  ): Promise<EmbeddedChunk[]> {
    const results: EmbeddedChunk[] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);

      console.log(
        `Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}  (${texts.length} chunks)`,
      );

      const embeddings = await this.fetchEmbeddings(texts);

      for (let i = 0; i < batch.length; i++) {
        results.push({
          chunk: batch[i],
          embedding: embeddings[i],
        });
      }
    }

    this.count = 0;
    return results;
  }
}

/**
 In → DocumentChunk[] + optional batchSize (default 32)
  
    [
      { id: "abc-123", content: "...", metadata: { path: "...", language: "...", startLine: 1, endLine: 5 } },
      { id: "def-456", content: "...", metadata: { path: "...", language: "...", startLine: 6, endLine: 12 } },
      // ... potentially hundreds of chunks
    ]
  
  Out → EmbeddedChunk[] — one EmbeddedChunk per input chunk, in the same order
  
    [
      { chunk: { id: "abc-123", ... }, embedding: [0.012, -0.034, ...] },
      { chunk: { id: "def-456", ... }, embedding: [0.089, 0.123, ...] },
      // ...
    ]
  ──────
 */
