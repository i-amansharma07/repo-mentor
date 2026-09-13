import type { DocumentChunk } from "./chunk";

export type EmbeddedChunk = {
  chunk: DocumentChunk;
  embedding: number[];
};
