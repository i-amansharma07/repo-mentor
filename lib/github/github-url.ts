export type GithubRepository = {
  owner: string;
  repo: string;
};

/* 

input : parseGitHubUrl(
  "https://github.com/facebook/react"
);

output : {
  owner: "facebook",
  repo: "react"
}

*/

export function parseGithubUrl(url: string): GithubRepository {
  //for ssh handling
  if (url.startsWith("git@")) {
    const sshMatch = url.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
    if (!sshMatch) throw new Error("Invalid SSH GitHub URL");
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    };
  }

  //for https handling
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid Url");
  }

  if (parsedUrl.hostname !== "github.com")
    throw new Error("Only Github Repo Urls supported");

  const parts = parsedUrl.pathname.split("/").filter(Boolean);

  if (parts.length < 2) throw new Error("Invalid Repo Url");

  const [owner, repo] = parts;

  return {
    owner,
    repo: repo.replace(/\.git$/, ""),
  };
}
