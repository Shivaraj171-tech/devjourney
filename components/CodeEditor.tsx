"use client";
// Monaco (the editor from VS Code), served from /monaco/vs on our own site
// instead of a CDN. Files are copied there by scripts/copy-assets.mjs.
import Editor, { loader } from "@monaco-editor/react";

if (typeof window !== "undefined") {
  loader.config({ paths: { vs: "/monaco/vs" } });
}

type Props = {
  /** Unique per file so each file keeps its own undo history. */
  path: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
};

export default function CodeEditor({ path, value, readOnly, onChange }: Props) {
  return (
    <Editor
      path={path}
      language="python"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      loading={<div className="p-4 text-sm text-slate-400">Loading editor…</div>}
      options={{
        readOnly,
        fontSize: 15,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: 4,
        insertSpaces: true,
        automaticLayout: true,
        padding: { top: 12 },
      }}
    />
  );
}
