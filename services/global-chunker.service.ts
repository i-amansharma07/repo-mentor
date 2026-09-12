import type { RepositoryFile } from "@/types/repository";
import type { Chunker } from "@/types/chunker";

import { TypeScriptChunker } from "@/services/repository-chunking.service";
import { MarkdownChunker } from "@/services/markdown-chunking.service";
import { FallbackChunker } from "@/services/fallback-chunking.service";

/*

  RepositoryFile
       │
       ▼
  createChunker(file)
       │
       ├─ typescript / javascript  →  TypeScriptChunker  (AST-based)
       ├─ markdown                 →  MarkdownChunker    (heading-based)
       └─ everything else          →  FallbackChunker    (whole file)

*/
export function createChunker(file: RepositoryFile): Chunker {
  switch (file.language) {
    case "typescript":
    case "javascript":
      return new TypeScriptChunker(file);

    case "markdown":
      return new MarkdownChunker(file);

    default:
      return new FallbackChunker(file);
  }
}
