const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  java: "java",
  cs: "csharp",
  go: "go",
  md: "markdown",
  json: "json",
};

export function detectLanguage(
  path: string
): string {
  const extension = path
    .split(".")
    .pop()
    ?.toLowerCase();

  return extension
    ? LANGUAGE_MAP[extension] ?? "unknown"
    : "unknown";
}