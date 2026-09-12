import type { RepositoryFile } from "@/types/repository";
import type { DocumentChunk } from "@/types/chunk";
import type { Chunker } from "@/types/chunker";

/*

  Fallback for unsupported languages (JSON, etc.)
  Treats the entire file as a single chunk.

*/
export class FallbackChunker implements Chunker {
  private readonly file: RepositoryFile;

  constructor(file: RepositoryFile) {
    this.file = file;
  }

  chunk(): DocumentChunk[] {
    const content = this.file.content.trim();
    if (!content) return [];

    const lineCount = this.file.content.split("\n").length;

    return [
      {
        id: `${this.file.path}:1-${lineCount}`,
        content,
        metadata: {
          path: this.file.path,
          language: this.file.language,
          startLine: 1,
          endLine: lineCount,
        },
      },
    ];
  }
}
