// The Source page reads the app's own code. Vite inlines these at build time,
// so the viewer never drifts from what actually shipped.
const appModules = import.meta.glob("/src/**/*.{ts,tsx,css}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const rootModules = import.meta.glob("/*.{ts,json,html}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type SourceFile = {
  /** Path relative to the project root, e.g. "src/lib/csv.ts". */
  path: string;
  name: string;
  code: string;
  language: string;
  lines: number;
};

export const SOURCE_FILES: SourceFile[] = Object.entries({
  ...rootModules,
  ...appModules,
})
  .map(([absPath, code]) => {
    const path = absPath.replace(/^\//, "");
    return {
      path,
      name: path.split("/").pop() ?? path,
      code,
      language: inferLanguage(path),
      lines: code.split("\n").length,
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

export function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "tsx":
      return "TSX";
    case "ts":
      return "TypeScript";
    case "css":
      return "CSS";
    case "json":
      return "JSON";
    case "html":
      return "HTML";
    default:
      return ext.toUpperCase() || "Text";
  }
}

export type TreeNode = {
  name: string;
  path: string;
  children: TreeNode[];
  file?: SourceFile;
};

/** Build a folder tree from the flat file list. */
export function buildTree(files: SourceFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let next = node.children.find((c) => c.name === part);
      if (!next) {
        next = { name: part, path, children: [] };
        node.children.push(next);
      }
      if (isLeaf) next.file = file;
      node = next;
    });
  }
  const sort = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      const aDir = a.children.length > 0;
      const bDir = b.children.length > 0;
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sort(n.children));
    return nodes;
  };
  return sort(root.children);
}
