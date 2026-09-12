/*

GitHub API response
        ↓
   normalize
        ↓
RepositoryFile
        ↓
      RAG

*/

export type RepositoryFile = {
  path: string;
  content: string;
  language: string;
  size: number;
};

export type RepositryInfo = {
  owner: string;
  name: string;
  defaultBranch: string;
};
