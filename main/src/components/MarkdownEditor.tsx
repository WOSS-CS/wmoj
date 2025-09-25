'use client';

import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
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

  return (
    <div className={`markdown-editor ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Problem Description</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
              !isPreview 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
              isPreview 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Preview
          </button>
        </div>
      </div>
      
      <div className="border border-white/20 rounded-lg overflow-hidden">
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || '')}
          height={height}
          data-color-mode="dark"
          preview={isPreview ? 'preview' : 'edit'}
          hideToolbar={isPreview}
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
            MDEditor.commands.bold,
            MDEditor.commands.italic,
            MDEditor.commands.strikethrough,
            MDEditor.commands.divider,
            MDEditor.commands.link,
            MDEditor.commands.quote,
            MDEditor.commands.code,
            MDEditor.commands.codeBlock,
            MDEditor.commands.divider,
            MDEditor.commands.unorderedListCommand,
            MDEditor.commands.orderedListCommand,
            MDEditor.commands.checkedListCommand,
            MDEditor.commands.divider,
            MDEditor.commands.title1,
            MDEditor.commands.title2,
            MDEditor.commands.title3,
            MDEditor.commands.title4,
            MDEditor.commands.title5,
            MDEditor.commands.title6,
            MDEditor.commands.divider,
            MDEditor.commands.hr,
            MDEditor.commands.table,
            MDEditor.commands.divider,
            MDEditor.commands.undo,
            MDEditor.commands.redo,
          ]}
        />
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        <p>💡 <strong>Markdown Tips:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>Use <code>**bold**</code> for bold text</li>
          <li>Use <code>*italic*</code> for italic text</li>
          <li>Use <code>`code`</code> for inline code</li>
          <li>Use <code>```language</code> for code blocks</li>
          <li>Use <code>#</code> for headers</li>
          <li>Use <code>-</code> or <code>*</code> for lists</li>
        </ul>
      </div>
    </div>
  );
}
