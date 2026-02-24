'use client';

import { useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  cpp: 'cpp',
  java: 'java',
};

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const monacoLanguage = LANGUAGE_MAP[language] || 'plaintext';

  const handleMount: OnMount = useCallback((editor) => {
    editor.focus();
  }, []);

  return (
    <div className="code-editor-container">
      <Editor
        height="400px"
        language={monacoLanguage}
        value={value}
        onChange={(val) => onChange(val ?? '')}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          tabSize: 4,
          automaticLayout: true,
          wordWrap: 'on',
          suggestOnTriggerCharacters: false,
          quickSuggestions: false,
          parameterHints: { enabled: false },
        }}
      />
    </div>
  );
}
