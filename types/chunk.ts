export type DocumentChunk = {
  id: string;
  content: string;
  metadata: {
    path: string;
    language: string;
    startLine: number;
    endLine: number;
  };
};
