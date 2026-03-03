'use client';

import { useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useTheme } from '@/contexts/ThemeContext';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  cpp: 'cpp',
  java: 'java',
};

export default function CodeEditor({ language, value, onChange, height = '400px' }: CodeEditorProps) {
  const { theme } = useTheme();
  const monacoLanguage = LANGUAGE_MAP[language] || 'plaintext';
  const monacoTheme = theme === 'light' ? 'light' : 'vs-dark';

  const handleMount: OnMount = useCallback((editor) => {
    editor.focus();
  }, []);

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
