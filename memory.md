# GitHub RAG — Project Memory

## What Is This Project?

A **GitHub Repository Analyser** built as a Next.js app. The goal is to build a full RAG (Retrieval-Augmented Generation) pipeline from scratch — starting with manual implementations before introducing LangChain later. You give it a GitHub repo URL, it fetches the code, chunks it into semantically meaningful pieces, and (eventually) stores embeddings in a vector DB for similarity search and conversational Q&A.

---

## 10-Phase Roadmap (`phases.txt`)

| # | Phase | Status |
|---|-------|--------|
| 1 | Repository ingestion | ✅ Done |
| 2 | Document / code chunking | ✅ Done (TypeScript chunker) |
| 3 | Embeddings | 🔜 Next |
| 4 | Vector storage / similarity search | ⬜ |
| 5 | Basic RAG (manual) | ⬜ |
| 6 | Improved / code-aware retrieval | ⬜ |
| 7 | Conversational RAG | ⬜ |
| 8 | Evaluation / observability | ⬜ |
| 9 | Introduce LangChain & compare with manual | ⬜ |
| 10 | Tools / agents | ⬜ |

---

## Architecture & Data Flow

```
POST /api/repositories/ingest  (body: { url })
         │
         ▼
   parseGithubUrl(url)            →  { owner, repo }
         │
         ▼
   getRepository(owner, repo)     →  default_branch
         │
         ▼
   getRepositoryTree(…, branch)   →  full recursive Git tree
         │
         ▼
   filter: blob + shouldIncludeFile()
         │
         ▼
   getFileContent(…, sha)  (loop) →  base64 → UTF-8
         │
         ▼
   RepositoryFile[]   ← Phase 1 output
         │
         ▼
   TypeScriptChunker.chunk()      →  AST-based chunking per file
         │
         ▼
   DocumentChunk[][]  ← Phase 2 output  (also written to chunks.json)
```

---

## File-by-File Breakdown

### API Layer

| File | Purpose |
|------|---------|
| [`app/api/repositories/ingest/route.ts`](file:///home/aman-sharma/Desktop/github-rag/app/api/repositories/ingest/route.ts) | `POST` endpoint — orchestrates ingestion + chunking. Writes `chunks.json` (all chunks) and `error.json` (files that produced 0 chunks). |

### Services

| File | Purpose |
|------|---------|
| [`services/repository-ingestion.service.ts`](file:///home/aman-sharma/Desktop/github-rag/services/repository-ingestion.service.ts) | `RepositoryIngestionService.ingest(url)` — Phase 1. Parses URL → fetches repo metadata → fetches tree → filters files → fetches each file's content → returns `{ repository, files }`. |
| [`services/repository-chunking.service.ts`](file:///home/aman-sharma/Desktop/github-rag/services/repository-chunking.service.ts) | `TypeScriptChunker` — Phase 2. Uses the **TypeScript compiler API** (`ts.createSourceFile`) to parse source into an AST, then walks the tree extracting chunks for: functions, arrow functions, classes, methods, constructors, getters/setters, interfaces, type aliases, enums. Each chunk gets an `id`, `content`, and `metadata` (path, language, line range). |

### GitHub Client (`lib/github/`)

| File | Purpose |
|------|---------|
| [`lib/github/github-client.ts`](file:///home/aman-sharma/Desktop/github-rag/lib/github/github-client.ts) | Thin wrapper around `fetch` for the GitHub REST API. Functions: `getRepository`, `getRepositoryTree`, `getFileContent`. Uses optional `GITHUB_TOKEN` from env. |
| [`lib/github/github-url.ts`](file:///home/aman-sharma/Desktop/github-rag/lib/github/github-url.ts) | `parseGithubUrl(url)` — handles both HTTPS and SSH (`git@`) GitHub URLs, returns `{ owner, repo }`. |

### Utilities (`utils/`)

| File | Purpose |
|------|---------|
| [`utils/file-fliter.ts`](file:///home/aman-sharma/Desktop/github-rag/utils/file-fliter.ts) | `shouldIncludeFile(path)` — filters out `node_modules`, `.git`, lock files, etc. Only keeps files with supported extensions (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.java`, `.cs`, `.go`, `.md`, `.json`). |
| [`utils/language.ts`](file:///home/aman-sharma/Desktop/github-rag/utils/language.ts) | `detectLanguage(path)` — maps file extension to language name (e.g. `.ts` → `"typescript"`). |

### Types (`types/`)

| File | Purpose |
|------|---------|
| [`types/repository.ts`](file:///home/aman-sharma/Desktop/github-rag/types/repository.ts) | `RepositoryFile` (`path`, `content`, `language`, `size`) and `RepositryInfo` (`owner`, `name`, `defaultBranch`). |
| [`types/chunk.ts`](file:///home/aman-sharma/Desktop/github-rag/types/chunk.ts) | `DocumentChunk` — `{ id, content, metadata: { path, language, startLine, endLine } }`. |

---

## Key Design Decisions

1. **Manual chunker, not LangChain** — the project intentionally builds everything by hand first (LangChain comes in Phase 9).
2. **AST-based chunking** — uses the real TypeScript compiler to parse code into an AST rather than naive line/character splitting. This produces semantically meaningful chunks (whole functions, classes, interfaces, etc.).
3. **The chunker is TypeScript-only** — despite supporting multiple file extensions in the filter, only `TypeScriptChunker` exists. Files that aren't valid TS/JS produce 0 chunks and get logged to `error.json`.
4. **Sequential file fetching** — files are fetched one-by-one via the GitHub Blob API (by SHA), not batched.
5. **No database yet** — chunks are written to a local `chunks.json` file; vector storage comes in Phase 4.

---

## Tech Stack

- **Next.js 16.3.4** (App Router)
- **TypeScript 5.9.3** (also used as the chunker's parser via `ts.createSourceFile`)
- **React 19** (frontend, not yet meaningful)
- **Tailwind CSS 4**
- **GitHub REST API** (no Octokit — raw `fetch`)

---

## Environment

- `GITHUB_TOKEN` — optional env var for authenticated GitHub API requests (higher rate limits).

---

## What's Missing / Next Steps

- **Embeddings** (Phase 3) — take each `DocumentChunk.content` and generate vector embeddings (e.g. via OpenAI, Cohere, or a local model).
- **Chunkers for other languages** — Python, Java, Go, etc. Currently only TS/JS files produce meaningful chunks.
- **Vector DB** (Phase 4) — store embeddings + metadata for similarity search.
- **Error handling on the chunking side** — files that fail to chunk silently append to `error.json` with no retry or fallback strategy.
- **Typo**: `RepositryInfo` → should be `RepositoryInfo`.
