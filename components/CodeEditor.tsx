"use client";
// Monaco (the editor from VS Code), served from /monaco/vs on our own site
// instead of a CDN. Files are copied there by scripts/copy-assets.mjs.
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/basePath";

if (typeof window !== "undefined") {
  loader.config({ paths: { vs: withBase("/monaco/vs") } });
}

type MonacoEditor = Parameters<OnMount>[0];

type Props = {
  /** Unique per file so each file keeps its own undo history. */
  path: string;
  value: string;
  readOnly: boolean;
  onChange?: (value: string) => void;
  /** Called on Ctrl/Cmd + Enter inside the editor. */
  onRun?: () => void;
  /** Debugger: highlight this line (1-based) as the one that runs next. */
  highlightLine?: number;
};

export default function CodeEditor({ path, value, readOnly, onChange, onRun, highlightLine }: Props) {
  // onMount runs once, so keep the latest onRun in a ref.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  // ----- debugger line highlight (Monaco decorations; the editor stays editable) -----
  const [editor, setEditor] = useState<MonacoEditor | null>(null);
  const highlightRef = useRef(highlightLine);
  const applyRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!editor) return;
    const decorations = editor.createDecorationsCollection();
    const apply = () => {
      const line = highlightRef.current;
      const model = editor.getModel();
      if (!line || !model || line > model.getLineCount()) {
        decorations.clear();
        return;
      }
      decorations.set([
        {
          range: { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 },
          options: {
            isWholeLine: true,
            className: "debug-current-line",
            linesDecorationsClassName: "debug-current-glyph",
            overviewRuler: { color: "#facc15", position: 4 /* OverviewRulerLane.Full */ },
          },
        },
      ]);
      editor.revealLineInCenterIfOutsideViewport(line);
    };
    applyRef.current = apply;
    apply();
    // Switching file tabs swaps the model inside the same editor: re-apply.
    const sub = editor.onDidChangeModel(apply);
    return () => {
      sub.dispose();
      decorations.clear();
      applyRef.current = null;
    };
  }, [editor]);
  useEffect(() => {
    highlightRef.current = highlightLine;
    applyRef.current?.();
  }, [highlightLine, path]);

  return (
    <Editor
      onMount={(mounted, monaco) => {
        // Monaco handles Ctrl+Enter itself ("insert line below"), so a window
        // listener never sees it while typing. Register our shortcut here.
        mounted.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
        setEditor(mounted);
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
