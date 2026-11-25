"use client";
// Monaco (the editor from VS Code), served from /monaco/vs on our own site
// instead of a CDN. Files are copied there by scripts/copy-assets.mjs.
//
// Keyboard (audit flaw 1, a keyboard trap): Tab indents inside the editor, as
// coders expect, so there are two ways out, both shown in a hint while the
// editor has focus and in its accessible name:
// - Esc then Tab (or Shift+Tab) moves focus to the next (previous) control.
// - Ctrl+M toggles Monaco's `tabFocusMode` option: Tab moves focus instead of indenting.
import Editor, { loader, type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/basePath";
import { useEffectiveTheme } from "@/lib/useTheme";

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
  /** Phone: wrap long lines and use a slimmer gutter, so code never scrolls sideways. */
  compact?: boolean;
  /** Called with the height (px) the code needs, e.g. to size a phone editor to its content. */
  onContentHeight?: (height: number) => void;
};

// Themes with AA contrast (audit flaw 9): comments and line numbers were 4.2:1 and 1.79:1.
// Editor backgrounds match the app's --dj-editor token.
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("dj-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [{ token: "comment", foreground: "9CC796", fontStyle: "italic" }], // 8.9:1
    colors: {
      "editor.background": "#161b38",
      "editorLineNumber.foreground": "#9aa3c7", // 6.9:1
      "editorLineNumber.activeForeground": "#f7f8fc",
      "editor.lineHighlightBackground": "#1f2650",
      "editorIndentGuide.background1": "#2c3561",
      "editorGutter.background": "#161b38",
    },
  });
  monaco.editor.defineTheme("dj-light", {
    base: "vs",
    inherit: true,
    rules: [{ token: "comment", foreground: "2F6B2C", fontStyle: "italic" }], // 6.4:1
    colors: {
      "editor.background": "#fbfcff",
      "editorLineNumber.foreground": "#4f5a7c", // 6.9:1
      "editorLineNumber.activeForeground": "#121833",
      "editor.lineHighlightBackground": "#eef1f8",
      "editorGutter.background": "#fbfcff",
    },
  });
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Move focus to the control after (or before) `container` in page order, skipping the editor itself. */
function focusOutside(container: HTMLElement, backwards: boolean) {
  const all = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !container.contains(el) && el.getClientRects().length > 0 && !el.closest("[hidden],[inert]"),
  );
  const after = all.filter((el) => container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  const before = all.filter((el) => container.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
  const target = backwards ? before.at(-1) : after[0];
  target?.focus();
}

export default function CodeEditor({ path, value, readOnly, onChange, onRun, highlightLine, compact = false, onContentHeight }: Props) {
  const theme = useEffectiveTheme();
  // onMount runs once, so keep the latest onRun in a ref.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [tabMovesFocus, setTabMovesFocus] = useState(false);
  const tabMovesRef = useRef(false);

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

  // Content height (changes with wrapping, edits and file switches).
  const heightRef = useRef(onContentHeight);
  useEffect(() => {
    heightRef.current = onContentHeight;
  }, [onContentHeight]);
  useEffect(() => {
    if (!editor) return;
    const report = () => heightRef.current?.(editor.getContentHeight());
    report();
    const sub = editor.onDidContentSizeChange(report);
    return () => sub.dispose();
  }, [editor]);

  const fileName = path.split("/").slice(2).join("/") || path;
  const ariaLabel = `Code editor, ${fileName}${readOnly ? ", read-only" : ""}. Press Escape then Tab to leave the editor, or Control M to make Tab move focus.`;

  return (
    <div ref={wrapRef} className="relative h-full" data-testid="code-editor">
      <Editor
        beforeMount={defineThemes}
        onMount={(mounted, monaco) => {
          // Monaco handles Ctrl+Enter itself ("insert line below"), so a window
          // listener never sees it while typing. Register our shortcut here.
          mounted.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
          // Ctrl+M (Windows/Linux) and Ctrl+M (macOS, WinCtrl): Tab moves focus on/off.
          const toggle = () => {
            tabMovesRef.current = !tabMovesRef.current;
            mounted.updateOptions({ tabFocusMode: tabMovesRef.current });
            setTabMovesFocus(tabMovesRef.current);
          };
          mounted.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM, toggle);
          mounted.addCommand(monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyM, toggle);
          // Esc then Tab: leave the editor (Shift+Tab goes back).
          let escArmed = false;
          mounted.onKeyDown((e) => {
            if (e.keyCode === monaco.KeyCode.Escape) {
              escArmed = true;
              return;
            }
            if (e.keyCode === monaco.KeyCode.Tab && escArmed && wrapRef.current) {
              e.preventDefault();
              e.stopPropagation();
              escArmed = false;
              focusOutside(wrapRef.current, e.shiftKey);
              return;
            }
            if (e.keyCode !== monaco.KeyCode.Shift) escArmed = false;
          });
          mounted.onDidFocusEditorText(() => setFocused(true));
          mounted.onDidBlurEditorText(() => {
            escArmed = false;
            setFocused(false);
          });
          setEditor(mounted);
        }}
        path={path}
        language="python"
        theme={theme === "light" ? "dj-light" : "dj-dark"}
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        loading={<div className="p-4 text-sm text-slate-300">Loading the editor…</div>}
        options={{
          readOnly,
          ariaLabel,
          fontSize: compact ? 14 : 15,
          fontFamily: 'ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Code", Menlo, Consolas, "Liberation Mono", monospace',
          wordWrap: compact ? "on" : "off",
          wrappingIndent: "indent",
          lineNumbersMinChars: compact ? 3 : 4,
          folding: !compact,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          padding: { top: 12, bottom: compact ? 12 : 36 },
        }}
      />
      {!compact && (
        <p
          data-testid="editor-keyboard-hint"
          data-visible={focused || tabMovesFocus}
          aria-hidden={!(focused || tabMovesFocus)}
          className={`pointer-events-none absolute right-3 bottom-2 rounded-md border border-rule bg-panel px-2 py-1 text-xs text-slate-200 transition-opacity motion-reduce:transition-none ${
            focused || tabMovesFocus ? "opacity-100" : "opacity-0"
          }`}
        >
          {tabMovesFocus ? (
            <>
              Tab now moves focus. <kbd className="font-sans font-semibold">Ctrl+M</kbd> to indent with Tab again.
            </>
          ) : (
            <>
              <kbd className="font-sans font-semibold">Esc</kbd> then <kbd className="font-sans font-semibold">Tab</kbd> leaves the editor.{" "}
              <kbd className="font-sans font-semibold">Ctrl+M</kbd>: Tab moves focus.
            </>
          )}
        </p>
      )}
    </div>
  );
}
