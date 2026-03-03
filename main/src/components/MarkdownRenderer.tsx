'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeSanitize from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Import defaultSchema directly instead of using require, so we stay typesafe
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - rehype-sanitize types may not export defaultSchema formally
import { defaultSchema } from 'hast-util-sanitize';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Extend sanitize schema to permit KaTeX output (span.math-inline, span.math-display, and katex-generated markup)
// while preserving overall XSS protections.
const katexAllowedTags = [
  'span', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'mspace', 'mtext', 'annotation', 'semantics'
];

type SanitizeSchema = {
  tagNames?: string[];
  attributes?: Record<string, unknown>;
  protocols?: unknown;
};

const base: SanitizeSchema = (defaultSchema as SanitizeSchema) || {};

function getAttrArray(schema: SanitizeSchema, key: string): unknown[] {
  if (!schema.attributes) return [];
  const existing = (schema.attributes as Record<string, unknown>)[key];
  return Array.isArray(existing) ? existing : [];
}

const sanitizeOptions: SanitizeSchema = (() => {
  const spanExisting = getAttrArray(base, 'span');
  const mathExisting = getAttrArray(base, 'math');
  const annotationExisting = getAttrArray(base, 'annotation');
  return {
    ...base,
    tagNames: Array.from(new Set([...(base.tagNames || []), ...katexAllowedTags])),
    attributes: {
      ...(base.attributes || {}),
      span: [
        ...spanExisting,
        ['className', /^katex.*$/],
        ['className', 'katex'],
        ['className', 'katex-display'],
        ['className', 'katex-html'],
        ['className', 'katex-mathml'],
      ],
      math: [...mathExisting, 'display'],
      annotation: [...annotationExisting, 'encoding'],
    }
  };
})();

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeSanitize, sanitizeOptions], rehypeKatex]}
        components={{
          code({ inline, className, children, ...props }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { inline?: boolean; className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-lg !my-3"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-surface-2 text-brand-primary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-2xl font-semibold text-foreground mb-3 border-b border-border pb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mb-2.5 mt-5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-foreground mb-2 mt-3">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-foreground mb-1.5 mt-3">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold text-text-muted mb-1.5 mt-3">{children}</h6>
          ),
          p: ({ children }) => (
            <p className="text-text-muted mb-3 leading-relaxed text-sm">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-text-muted mb-3 space-y-1 ml-4 text-sm">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-text-muted mb-3 space-y-1 ml-4 text-sm">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-text-muted">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-brand-primary pl-4 py-2 my-3 bg-surface-2 rounded-r-md">
              <div className="text-text-muted italic text-sm">{children}</div>
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-border rounded-lg text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-2">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-surface-1">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-foreground font-medium text-xs uppercase tracking-wider">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-text-muted">{children}</td>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-brand-primary hover:text-brand-secondary underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/80">{children}</em>
          ),
          hr: () => (
            <hr className="border-border my-5" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
