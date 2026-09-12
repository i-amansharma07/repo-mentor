import type { RepositoryFile } from "@/types/repository";
import type { DocumentChunk } from "@/types/chunk";
import type { Chunker } from "@/types/chunker";

/*

  Markdown file
       │
       ▼
  Split on heading lines (# , ## , ### , etc.)
       │
       ▼
  Each section (heading + body) = one chunk

  Example:
    ## Features        ──► Chunk 1
    some text...

    ## Setup           ──► Chunk 2
    some text...

*/
export class MarkdownChunker implements Chunker {
  private readonly file: RepositoryFile;

  constructor(file: RepositoryFile) {
    this.file = file;
  }

  chunk(): DocumentChunk[] {
    const lines = this.file.content.split("\n");

    // Find all heading line indices
    const headingIndices: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) {
        headingIndices.push(i);
      }
    }

    // If no headings found, treat the entire file as a single chunk
    if (headingIndices.length === 0) {
      const content = this.file.content.trim();
      if (!content) return [];

      return [
        {
          id: `${this.file.path}:1-${lines.length}`,
          content,
          metadata: {
            path: this.file.path,
            language: this.file.language,
            startLine: 1,
            endLine: lines.length,
          },
        },
      ];
    }

    const chunks: DocumentChunk[] = [];

    // If there's content before the first heading, capture it
    if (headingIndices[0] > 0) {
      const content = lines.slice(0, headingIndices[0]).join("\n").trim();
      if (content) {
        chunks.push({
          id: `${this.file.path}:1-${headingIndices[0]}`,
          content,
          metadata: {
            path: this.file.path,
            language: this.file.language,
            startLine: 1,
            endLine: headingIndices[0],
          },
        });
      }
    }

    // Each heading section = one chunk
    for (let i = 0; i < headingIndices.length; i++) {
      const startIdx = headingIndices[i];
      const endIdx =
        i + 1 < headingIndices.length ? headingIndices[i + 1] : lines.length;

      const content = lines.slice(startIdx, endIdx).join("\n").trim();
      if (!content) continue;

      chunks.push({
        id: `${this.file.path}:${startIdx + 1}-${endIdx}`,
        content,
        metadata: {
          path: this.file.path,
          language: this.file.language,
          startLine: startIdx + 1,
          endLine: endIdx,
        },
      });
    }

    return chunks;
  }
}
