import {
  getFileContent,
  getRepository,
  getRepositoryTree,
} from "@/lib/github/github-client";

import { parseGithubUrl } from "@/lib/github/github-url";
import { shouldIncludeFile } from "@/utils/file-fliter";
import { detectLanguage } from "@/utils/language";

import type { RepositoryFile, RepositryInfo } from "@/types/repository";

export class RepositoryIngestionService {
  async ingest(repositoryUrl: string): Promise<{
    repository: RepositryInfo;
    files: RepositoryFile[];
  }> {
    const { owner, repo } = parseGithubUrl(repositoryUrl);

    //1. get repo metadata
    const repository = await getRepository(owner, repo);

    const default_branch = repository.default_branch;

    // console.log("1. default branch", default_branch);

    //2. Get repo tree
    const { tree, truncated } = await getRepositoryTree(
      owner,
      repo,
      default_branch,
    );

    // console.log("2. tree is : ", tree);

    if (truncated) {
      throw new Error(
        "Repository tree is too large and was truncated by GitHub",
      );
    }

    //3. only keep files
    const files = tree.filter(
      (item) => item.type === "blob" && shouldIncludeFile(item.path),
    );

    // console.log("3. files", files);

    //4. fetch file contents
    const repositoryFiles: RepositryFile[] = [];

    for (const file of files) {
      if (!file.size) continue;

      const result = await getFileContent(owner, repo, file.sha);

      repositoryFiles.push({
        path: file.path,
        content: result.content,
        size: result.size,
        language: detectLanguage(file.path),
      });
    }

    // console.log("4. repoFiles", repositoryFiles);

    return {
      repository: {
        owner,
        name: repo,
        defaultBranch: default_branch,
      },
      files: repositoryFiles,
    };
  }
}
