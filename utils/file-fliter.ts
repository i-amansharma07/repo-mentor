const IGNORED_DIRECTORIES = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
];

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".cs",
  ".go",
  ".md",
  ".json",
];

const IGNORED_FILENAMES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
];

export function shouldIncludeFile(
  path: string
): boolean {
  const lowerPath = path.toLowerCase();

  const parts = lowerPath.split("/");

  const hasIgnoredDirectory =
    parts.some((part) =>
      IGNORED_DIRECTORIES.includes(part)
    );

  if (hasIgnoredDirectory) {
    return false;
  }

  const filename = parts.at(-1);

  if (
    filename &&
    IGNORED_FILENAMES.includes(filename)
  ) {
    return false;
  }

  return SUPPORTED_EXTENSIONS.some((extension) =>
    lowerPath.endsWith(extension)
  );
}