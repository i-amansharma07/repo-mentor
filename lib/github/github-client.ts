const GITHUB_API = "https://api.github.com";

//fetch interface to call github
async function githubFetch<T>(endpoint: string): Promise<T> {
  console.log("******endpoint*****", endpoint);
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN
        ? {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }
        : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Github Api Error ${response.status} : ${body}`);
  }

  return response.json();
}

type GitHubRepositoryResponse = {
  default_branch: string;
};

export async function getRepository(owner: string, repo: string) {
  return githubFetch<GitHubRepositoryResponse>(`/repos/${owner}/${repo}`);
}

type GitTreeItem = {
  path: string;
  mode: string;
  type: "blob" | "tree"; //tree =>  directory, blob => file (with code/content)
  sha: string;
  size?: number;
  url: string;
};

type GithubTreeResponse = {
  truncated: boolean;
  tree: GitTreeItem[];
};

export async function getRepositoryTree(
  owner: string,
  repo: string,
  branch: string,
) {
  return githubFetch<GithubTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
}

type GitBlobRespose = {
  content: string;
  encoding: string;
  size: number;
};

//to fetch the file with it's sha
export async function getFileContent(
  owner: string,
  repo: string,
  sha: string,
): Promise<{ content: string; size: number }> {
  const blob = await githubFetch<GitBlobRespose>(
    `/repos/${owner}/${repo}/git/blobs/${sha}`,
  );

  if (blob.encoding !== "base64") {
    throw new Error(`Unexpected blob encoding: ${blob.encoding}`);
  }

  const content = Buffer.from(blob.content, "base64").toString("utf-8");

  return {
    content,
    size: blob.size,
  };
}
