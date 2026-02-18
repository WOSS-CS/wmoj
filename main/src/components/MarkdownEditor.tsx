'use client';

import { useState } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useTheme } from '@/contexts/ThemeContext';
import '@uiw/react-md-editor/markdown-editor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter markdown content...",
  height = 400,
  className = ""
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const { theme } = useTheme();

  return (
    <div className={`markdown-editor ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Problem Description</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${!isPreview
              ? 'bg-brand-primary text-black font-bold'
              : 'bg-surface-2 text-text-muted hover:bg-surface-3'
              }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${isPreview
              ? 'bg-brand-primary text-black font-bold'
              : 'bg-surface-2 text-text-muted hover:bg-surface-3'
              }`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {!isPreview && (
          <MDEditor
            value={value}
            onChange={(val) => onChange(val || '')}
            height={height}
            data-color-mode={theme === 'dark' ? 'dark' : 'light'}
            preview="edit"
            hideToolbar={false}
            visibleDragbar={false}
            textareaProps={{
              placeholder,
              style: {
                fontSize: 14,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              },
            }}
            toolbarHeight={50}
            commands={[
              commands.bold,
              commands.italic,
              commands.strikethrough,
              commands.divider,
              commands.link,
              commands.quote,
              commands.code,
              commands.codeBlock,
              commands.divider,
              commands.unorderedListCommand,
              commands.orderedListCommand,
              commands.checkedListCommand,
              commands.divider,
              commands.title1,
              commands.title2,
              commands.title3,
              commands.title4,
              commands.title5,
              commands.title6,
              commands.divider,
              commands.hr,
              commands.table,
            ]}
          />
        )}
        {isPreview && (
          <div className="p-6 bg-surface-2/30 max-h-[600px] overflow-auto">
            <MarkdownRenderer content={value} />
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-text-muted">
        <p>💡 <strong>Markdown Tips:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Use <code>**bold**</code> for bold text</li>
          <li>Use <code>*italic*</code> for italic text</li>
          <li>Use <code>`code`</code> for inline code</li>
          <li>Use <code>```language</code> for code blocks</li>
          <li>Use <code>#</code> for headers</li>
          <li>Use <code>-</code> or <code>*</code> for lists</li>
          <li>Inline math with <code>$f(x)=x^2$</code></li>
          <li>Block math with <code>{'$$\\sum_{i=1}^n i^2$$'}</code></li>
        </ul>
      </div>
    </div>
  );
}
