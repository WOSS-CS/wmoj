'use client';

import { useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useTheme } from '@/contexts/ThemeContext';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
  autoFocus?: boolean;
}

// Map app-side language codes (including legacy 'python' and 'cpp') to the
// identifiers Monaco understands. PyPy uses Python's grammar; all C++
// dialects share the 'cpp' grammar.
const LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  python3: 'python',
  pypy3: 'python',
  cpp: 'cpp',
  cpp14: 'cpp',
  cpp17: 'cpp',
  cpp20: 'cpp',
  cpp23: 'cpp',
};

export default function CodeEditor({ language, value, onChange, height = '400px', autoFocus = false }: CodeEditorProps) {
  const { theme } = useTheme();
  const monacoLanguage = LANGUAGE_MAP[language] || 'plaintext';
  const monacoTheme = theme === 'light' ? 'light' : 'vs-dark';

  // Only grab focus on mount when the caller opts in (e.g. the submit page,
  // where the editor is the primary input and sits at the top). Focusing
  // scrolls the editor into view, so leave it off for form pages where the
  // editor sits below the fold — otherwise the page jumps down on load.
  const handleMount: OnMount = useCallback((editor) => {
    if (autoFocus) editor.focus();
  }, [autoFocus]);

  return (
    <div className="code-editor-container">
      <Editor
        height={height}
        language={monacoLanguage}
        value={value}
        onChange={(val) => onChange(val ?? '')}
        onMount={handleMount}
        theme={monacoTheme}
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          tabSize: 4,
          automaticLayout: true,
          wordWrap: 'on',
          suggestOnTriggerCharacters: false,
          quickSuggestions: false,
          parameterHints: { enabled: false },
          lineHeight: 20,
          folding: true,
          bracketPairColorization: { enabled: true },
          guides: { indentation: true, bracketPairs: false },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        }}
      />
    </div>
  );
}
