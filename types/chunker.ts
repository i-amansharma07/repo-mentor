import type { DocumentChunk } from "@/types/chunk";

export interface Chunker {
  chunk(): DocumentChunk[];
}
