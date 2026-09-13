import { NextRequest, NextResponse } from "next/server";
import { createChunker } from "@/services/global-chunker.service";
import { DocumentChunk } from "@/types/chunk";
import fs from "fs";
import { EmbeddedChunk } from "@/types/embedding";

import {
  RepositoryIngestionService,
  EmbedChunksService,
} from "@/app/container";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const url = body?.url;

    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        {
          error: "Repository URL is required",
        },
        { status: 400 },
      );
    }

    //we get all the allowed files from repo with {content, language, size, path}
    const { repository, files } = await RepositoryIngestionService.ingest(url);

    // we pass the results.files into the chunk service sequentially and strore the
    //result in a file

    //CHUNKING PROCESS
    if (!files || !Array.isArray(files))
      throw new Error("No items in files array");

    const allChunks: DocumentChunk[][] = [];
    const erronousChunk: DocumentChunk[][] = [];

    for (let file of files) {
      const chunker = createChunker({
        path: file.path,
        language: file.language,
        size: file.size,
        content: file.content,
      });

      const data = chunker.chunk();

      if (data.length === 0) {
        fs.appendFileSync("error.json", JSON.stringify(file, null, 2));
        erronousChunk.push(data);
        continue;
      }

      allChunks.push(data);
    }
    fs.writeFileSync("chunks.json", JSON.stringify(allChunks, null, 2));

    //EMBEDDING PROCESS
    const flatChunks = allChunks.flat();

    const embeddedChunks: EmbeddedChunk[] =
      await EmbedChunksService.embedChunks(flatChunks);

    fs.writeFileSync("embedding.json", JSON.stringify(embeddedChunks, null, 2));

    return NextResponse.json({
      repository: repository,
      totalFiles: files.length,
      totalChunks: flatChunks.length,
      erronousChunk: erronousChunk.length,
      totalEmbeddings: embeddedChunks.length,
      embeddingDimensions: embeddedChunks[0]?.embedding?.length,
    });
  } catch (error) {
    console.error("Repository ingestion failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to ingest repository",
      },
      { status: 500 },
    );
  }
}

/*

POST /api/repositories/ingest
             │
             ▼
     Repository URL
             │
             ▼
      parseGitHubUrl()
             │
             ▼
       owner + repo
             │
             ▼
      getRepository()
             │
             ▼
      default branch
             │
             ▼
    getRepositoryTree()
             │
             ▼
       Git tree
             │
             ▼
       filter blobs
             │
             ▼
     useful file paths
             │
             ▼
    getFileContent()
             │
             ▼
      base64 → UTF-8
             │
             ▼
     RepositoryFile[]
             │
             ▼
     Phase 1 complete

*/
