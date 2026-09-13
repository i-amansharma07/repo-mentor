# Phase 3 — Embeddings with Qwen3-Embedding-0.6B

## What Are We Doing?

In Phase 2 we broke every file into **`DocumentChunk[]`** — semantically meaningful pieces of code/text.
Now in Phase 3 we take each chunk's `content` string and turn it into a **vector (array of numbers)** using an embedding model.

```
DocumentChunk.content   →   Qwen3-Embedding-0.6B   →   number[]  (1024 floats)
```

Later (Phase 4) these vectors go into a vector DB so we can do similarity search — "find the chunks most related to this question."

---

## Why Qwen3-Embedding-0.6B?

| Property                      | Value                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------- |
| **Model**               | [`Qwen/Qwen3-Embedding-0.6B`](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B) |
| **Parameters**          | ~595 M (0.6 B)                                                                   |
| **Embedding dimension** | **1024**                                                                   |
| **Max context**         | 32 768 tokens                                                                    |
| **Pooling strategy**    | Last-token pooling                                                               |
| **Similarity function** | Cosine similarity                                                                |
| **License**             | Apache 2.0                                                                       |
| **Library**             | `sentence-transformers` / `transformers` / HF Inference API                  |

It's small enough to run locally (CPU or a modest GPU), open-source, and punches well above its weight on MTEB benchmarks.

---

## Two Approaches — Pick One

### Option A: HuggingFace Inference API (Recommended to start)

- **No GPU needed**, no model download, no Python.
- Just an HTTP call from our Next.js server.
- Free tier gives ~1 000 requests/day (good enough for development).
- We stay 100 % TypeScript.

### Option B: Local with Python + `sentence-transformers`

- Run the model on your own machine (CPU or GPU).
- Needs Python, `torch`, `sentence-transformers`.
- We'd spin up a tiny FastAPI server and call it from Next.js.
- Better for production / large repos / privacy.

> **We'll implement Option A first** because it keeps the project simple and TypeScript-only.
> Option B can be added later as a drop-in replacement (same input/output contract).

---

## Step-by-Step Implementation Plan

### Step 1 — Get a HuggingFace API Token

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
2. Create a new token (read access is enough).
3. Add it to `.env`:

```env
GITHUB_TOKEN=ghp_xxx           # already exists
HF_API_TOKEN=hf_xxxxxxxxxx     # ← add this
```

---

### Step 2 — Create the Embedding Types

Create **`types/embedding.ts`**:

```ts
import type { DocumentChunk } from "@/types/chunk";

/**
 * A single chunk with its embedding vector attached.
 */
export type EmbeddedChunk = {
  /** The original chunk (id, content, metadata) */
  chunk: DocumentChunk;
  /** 1024-dimensional embedding vector from Qwen3-Embedding-0.6B */
  embedding: number[];
};
```

This is the core new data structure. Each `DocumentChunk` gets paired with its `number[]` vector.

---

### Step 3 — Create the Embedding Service

Create **`services/embedding.service.ts`**:

```ts
import type { DocumentChunk } from "@/types/chunk";
import type { EmbeddedChunk } from "@/types/embedding";

const HF_API_URL =
  "https://router.huggingface.co/hf-inference/pipeline/feature-extraction/Qwen/Qwen3-Embedding-0.6B";

/**
 * Calls the HuggingFace Inference API to embed a batch of texts.
 *
 * @param texts - Array of strings to embed
 * @returns Array of embedding vectors (each is number[1024])
 */
async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw new Error("HF_API_TOKEN is not set in .env");

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: texts,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `HF Inference API error (${response.status}): ${errorBody}`,
    );
  }

  const embeddings: number[][] = await response.json();
  return embeddings;
}

/**
 * Embed a single chunk.
 */
export async function embedChunk(chunk: DocumentChunk): Promise<EmbeddedChunk> {
  const [embedding] = await fetchEmbeddings([chunk.content]);
  return { chunk, embedding };
}

/**
 * Embed chunks in batches.
 *
 * The HF API has payload limits, so we batch into groups of `batchSize`.
 * Each batch is one HTTP request.
 *
 * @param chunks - Flat array of DocumentChunks to embed
 * @param batchSize - How many chunks per API call (default 32)
 * @returns Array of EmbeddedChunks
 */
export async function embedChunks(
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

    const embeddings = await fetchEmbeddings(texts);

    for (let j = 0; j < batch.length; j++) {
      results.push({
        chunk: batch[j],
        embedding: embeddings[j],
      });
    }
  }

  return results;
}
```

**What this does:**

1. `fetchEmbeddings(texts)` — sends a POST to the HF Inference API with an array of strings, gets back an array of 1024-d vectors.
2. `embedChunks(chunks, batchSize)` — takes our `DocumentChunk[]`, batches them, calls the API, and returns `EmbeddedChunk[]`.

---

### Step 4 — Integrate into the Ingest API Route

Update **`app/api/repositories/ingest/route.ts`** to call the embedding service after chunking:

```ts
// NEW IMPORTS
import { embedChunks } from "@/services/embedding.service";
import type { EmbeddedChunk } from "@/types/embedding";

// ... existing code stays the same up to where we write chunks.json ...

// After: fs.writeFileSync("chunks.json", JSON.stringify(allChunks, null, 2));
// Add:

// Flatten all chunks into a single array for embedding
const flatChunks = allChunks.flat();

// Generate embeddings
const embeddedChunks: EmbeddedChunk[] = await embedChunks(flatChunks);

// Save embeddings to file (Phase 4 will move this to a vector DB)
fs.writeFileSync("embeddings.json", JSON.stringify(embeddedChunks, null, 2));

// Update the response
return NextResponse.json({
  repository: repository,
  totalFiles: files.length,
  totalChunks: allChunks.length,
  erronousChunk: erronousChunk.length,
  totalEmbeddings: embeddedChunks.length,
  embeddingDimension: embeddedChunks[0]?.embedding.length ?? 0,
});
```

---

### Step 5 — (Optional) Create a Standalone Embed Script

If you want to embed **already-chunked** data from `chunks.json` without re-ingesting, create **`app/api/embed/route.ts`**:

```ts
import { NextResponse } from "next/server";
import fs from "fs";

import { embedChunks } from "@/services/embedding.service";
import type { DocumentChunk } from "@/types/chunk";

export async function POST() {
  try {
    const raw = fs.readFileSync("chunks.json", "utf-8");
    const allChunks: DocumentChunk[][] = JSON.parse(raw);
    const flatChunks = allChunks.flat();

    console.log(`Embedding ${flatChunks.length} chunks...`);

    const embeddedChunks = await embedChunks(flatChunks);

    fs.writeFileSync(
      "embeddings.json",
      JSON.stringify(embeddedChunks, null, 2),
    );

    return NextResponse.json({
      totalEmbedded: embeddedChunks.length,
      embeddingDimension: embeddedChunks[0]?.embedding.length ?? 0,
      sampleId: embeddedChunks[0]?.chunk.id,
    });
  } catch (error) {
    console.error("Embedding failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Embedding failed",
      },
      { status: 500 },
    );
  }
}
```

Test it with:

```bash
curl -X POST http://localhost:3000/api/embed
```

---

### Step 6 — Test & Verify

After running the ingest or embed endpoint, check `embeddings.json`. Each entry should look like:

```json
{
  "chunk": {
    "id": "src/utils/helper.ts:5-12",
    "content": "function add(a: number, b: number): number {\n  return a + b;\n}",
    "metadata": {
      "path": "src/utils/helper.ts",
      "language": "typescript",
      "startLine": 5,
      "endLine": 12
    }
  },
  "embedding": [0.0234, -0.1123, 0.0891, ... ]   // ← 1024 numbers
}
```

**Quick sanity checks:**

1. Every `embedding` array should have exactly **1024** elements.
2. Values should be floats roughly in the range `[-1, 1]`.
3. Two chunks with similar code should have high cosine similarity (> 0.8).

---

## Data Flow After Phase 3

```
POST /api/repositories/ingest
         │
         ▼
  [Phase 1] Fetch repo files → RepositoryFile[]
         │
         ▼
  [Phase 2] AST chunking → DocumentChunk[][]
         │
         ▼
  [Phase 3] Qwen3-Embedding → EmbeddedChunk[]    ← NEW
         │
         ▼
  embeddings.json  (temporary — Phase 4 puts these in a vector DB)
```

---

## New Files Created

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `types/embedding.ts`            | `EmbeddedChunk` type definition            |
| `services/embedding.service.ts` | `embedChunks()` — calls HF Inference API  |
| `app/api/embed/route.ts`        | Standalone endpoint to embed existing chunks |

---

## Gotchas & Tips

1. **Rate limits** — The free HF Inference API is rate-limited. If you hit 429 errors, add a delay between batches or use an API key with higher limits.
2. **Cold starts** — The model may be "cold" on HF's servers. The first request can take 20–30 s. We pass `wait_for_model: true` to handle this.
3. **Token length** — Qwen3-Embedding supports up to 32 768 tokens. Our AST chunks are typically small (single functions/classes), so we should be well within limits. But if any chunk is enormous, consider truncating.
4. **Batch size** — We default to 32 chunks per API call. If you get payload-too-large errors, reduce this. If you have a paid plan, you can increase it.
5. **Cost** — The free tier gives you enough for dev. For production with thousands of chunks, consider running the model locally (Option B).

---

## Future: Option B — Local Model (for later)

When you're ready to run locally instead of via the API:

```bash
# Install Python deps
pip install sentence-transformers torch

# Python script (or FastAPI server)
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
embeddings = model.encode(["your chunk text here"])
# embeddings.shape → (1, 1024)
```

The `embedding.service.ts` would then call `http://localhost:8000/embed` instead of the HF API — same input/output shape, just a different URL.

---

## What's Next?

**Phase 4 — Vector Storage & Similarity Search**

Once we have `EmbeddedChunk[]`, we need a vector database (e.g. Qdrant, Pinecone, ChromaDB, or even a simple in-memory cosine search) to:

1. Store the embeddings.
2. Take a user query → embed it → find the top-K most similar chunks.
3. Return those chunks as "context" for the LLM in Phase 5.
