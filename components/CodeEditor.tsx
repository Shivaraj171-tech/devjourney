"use client";
// Monaco (the editor from VS Code), served from /monaco/vs on our own site
// instead of a CDN. Files are copied there by scripts/copy-assets.mjs.
import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useRef } from "react";

if (typeof window !== "undefined") {
  loader.config({ paths: { vs: "/monaco/vs" } });
}

type Props = {
  /** Unique per file so each file keeps its own undo history. */
  path: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
  /** Called on Ctrl/Cmd + Enter inside the editor. */
  onRun?: () => void;
};

export default function CodeEditor({ path, value, readOnly, onChange, onRun }: Props) {
  // onMount runs once, so keep the latest onRun in a ref.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  return (
    <Editor
      onMount={(editor, monaco) => {
        // Monaco handles Ctrl+Enter itself ("insert line below"), so a window
        // listener never sees it while typing. Register our shortcut here.
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
      }}
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
