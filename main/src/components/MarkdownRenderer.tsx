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
// KaTeX outputs mainly: span.katex, span.katex-html, span.katex-mathml, math, mrow, mi, mo, mn, mspace, mtext, annotation, annotation-xml.
// We'll allow span with class starting with 'katex' and data- attributes, plus math + related tags.
const katexAllowedTags = [
  'span', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'mspace', 'mtext', 'annotation', 'semantics'
];
// Build a schema extension (defensive: fallback if defaultSchema missing expected shape)
type SanitizeSchema = {
  tagNames?: string[];
  attributes?: Record<string, unknown>;
  protocols?: unknown;
};

const base: SanitizeSchema = (defaultSchema as SanitizeSchema) || {};
// Helper to safely extract existing attribute array from base schema without using 'any'
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
      math: [
        ...mathExisting,
        'display'
      ],
      annotation: [
        ...annotationExisting,
        'encoding'
      ],
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
                // Cast due to upstream type mismatch between exported style shape and expected index signature
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                className="rounded-lg"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-surface-2 text-green-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-foreground mb-4 border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold text-foreground mb-3 mt-6">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-bold text-foreground mb-2 mt-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-bold text-foreground mb-2 mt-3">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-base font-bold text-foreground mb-2 mt-3">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-bold text-foreground mb-2 mt-3">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="text-text-muted mb-4 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-text-muted mb-4 space-y-1 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-text-muted mb-4 space-y-1 ml-4">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-text-muted">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-green-400 pl-4 py-2 my-4 bg-surface-2/50 rounded-r-lg">
              <div className="text-text-muted italic">
                {children}
              </div>
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-border rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-2">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-surface-1/50">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-foreground font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-text-muted">
              {children}
            </td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-green-400 hover:text-green-300 underline transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/80">
              {children}
            </em>
          ),
          hr: () => (
            <hr className="border-border my-6" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
