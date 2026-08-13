import { useState, useMemo } from "react";
import { Copy, FileCode2, Folder, FolderOpen, Check } from "lucide-react";
import { SOURCE_FILES, buildTree, type TreeNode } from "@/lib/source-files";
import { cn } from "@/lib/utils";

export default function SourcePage() {
  const tree = useMemo(() => buildTree(SOURCE_FILES), []);
  const [selected, setSelected] = useState(
    () => SOURCE_FILES.find((f) => f.path.endsWith("src/lib/csv.ts")) ?? SOURCE_FILES[0]
  );
  const [open, setOpen] = useState<Set<string>>(() => new Set(["src", "src/lib", "src/pages"]));
  const [copied, setCopied] = useState(false);

  const toggle = (path: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const copy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!selected) return <p className="text-muted-foreground">No source files were bundled.</p>;

  const lines = selected.code.replace(/\n$/, "").split("\n");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Source</h1>
        <p className="text-sm text-muted-foreground">
          {SOURCE_FILES.length} files, read straight from the build.
        </p>
      </div>

      <div className="grid md:grid-cols-[16rem_1fr] gap-4 items-start">
        <nav className="rounded-xl border bg-card p-2 text-sm max-h-[36rem] overflow-auto">
          <Tree
            nodes={tree}
            depth={0}
            open={open}
            toggle={toggle}
            selectedPath={selected.path}
            onSelect={(node) => node.file && setSelected(node.file)}
          />
        </nav>

        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted">
            <FileCode2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-mono text-xs truncate">{selected.path}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {selected.language} · {selected.lines} lines
            </span>
            <button
              onClick={copy}
              className="ml-auto px-2 py-1 rounded border text-xs inline-flex items-center gap-1.5 bg-card"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-auto max-h-[36rem] text-xs leading-5">
            <code className="block font-mono">
              {lines.map((line, i) => (
                <span key={i} className="flex">
                  <span className="select-none w-12 shrink-0 pr-3 text-right text-muted-foreground/60">
                    {i + 1}
                  </span>
                  <span className="whitespace-pre pr-4">{line || " "}</span>
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

function Tree({
  nodes,
  depth,
  open,
  toggle,
  selectedPath,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  open: Set<string>;
  toggle: (path: string) => void;
  selectedPath: string;
  onSelect: (node: TreeNode) => void;
}) {
  return (
    <ul>
      {nodes.map((node) => {
        const isDir = node.children.length > 0;
        const isOpen = open.has(node.path);
        return (
          <li key={node.path}>
            <button
              onClick={() => (isDir ? toggle(node.path) : onSelect(node))}
              style={{ paddingLeft: depth * 12 + 8 }}
              className={cn(
                "w-full text-left py-1 pr-2 rounded flex items-center gap-1.5 hover:bg-muted",
                !isDir && node.path === selectedPath && "bg-secondary text-secondary-foreground"
              )}
            >
              {isDir ? (
                isOpen ? (
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
                )
              ) : (
                <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate font-mono text-xs">{node.name}</span>
            </button>
            {isDir && isOpen && (
              <Tree
                nodes={node.children}
                depth={depth + 1}
                open={open}
                toggle={toggle}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
