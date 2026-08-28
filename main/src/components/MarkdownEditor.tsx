'use client';

import { useState, useCallback } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { MarkdownRenderer } from './MarkdownRenderer';
import { toast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import '@uiw/react-md-editor/markdown-editor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  className?: string;
  label?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter markdown content...",
  height = 400,
  className = "",
  label = "Problem Description"
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { theme } = useTheme();

  const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = event.clipboardData?.files;
    if (!files || files.length === 0) return;

    const imageFile = Array.from(files).find((f: File) => f.type.startsWith('image/'));
    if (!imageFile) return;

    event.preventDefault();

    if (imageFile.size > 5 * 1024 * 1024) {
      // toast.* is the repo-wide feedback convention, and a blocking browser
      // dialog additionally destroys the textarea's selection — which is what
      // the caret position captured just below depends on.
      toast.error('Image too large', 'Maximum size is 5 MB.');
      return;
    }

    const textarea = event.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;

    setIsUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error('Not signed in', 'You must be logged in to upload images.');
        return;
      }

      const formData = new FormData();
      formData.append('file', imageFile);

      const res = await fetch('/api/upload/problem-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error('Upload failed', json.error || 'Failed to upload image.');
        return;
      }

      // Always emit an alt: reference/figures.md is explicit about it, and a
      // figure without one is invisible to every screen-reader user reading the
      // statement. The filename is a starting point the author should replace.
      const altText = imageFile.name.replace(/\.[^.]+$/, '').replace(/["<>]/g, '').trim() || 'Figure';
      const imgTag = `<img size="100" src="${json.url}" alt="${altText}" />`;
      const newValue = value.slice(0, cursorPos) + imgTag + value.slice(cursorPos);
      onChange(newValue);
    } catch {
      toast.error('Upload failed', 'Unexpected error uploading image.');
    } finally {
      setIsUploading(false);
    }
  }, [value, onChange]);

  return (
    <div className={`markdown-editor ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setIsPreview(false)}
            className={`px-3 py-1 rounded-md text-sm ${!isPreview
              ? 'bg-brand-primary text-white font-medium'
              : 'bg-surface-2 text-text-muted hover:bg-surface-3'
              }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setIsPreview(true)}
            className={`px-3 py-1 rounded-md text-sm ${isPreview
              ? 'bg-brand-primary text-white font-medium'
              : 'bg-surface-2 text-text-muted hover:bg-surface-3'
              }`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden relative">
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
              readOnly: isUploading,
              onPaste: handlePaste,
              style: {
                fontSize: 14,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              },
            }}
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
          <div className="p-5 bg-surface-1 max-h-[600px] overflow-auto">
            <MarkdownRenderer content={value} />
          </div>
        )}
        {isUploading && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-surface-1 border border-border rounded-md px-2.5 py-1.5 text-xs text-text-muted shadow-sm z-10">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading image…
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
          <li>Paste images from clipboard to embed them</li>
        </ul>
      </div>
    </div>
  );
}
