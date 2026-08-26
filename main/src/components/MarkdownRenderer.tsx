'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import dynamic from 'next/dynamic';
import { createContext, useContext } from 'react';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// `defaultSchema` comes from the *declared* dependency. It used to be imported
// from 'hast-util-sanitize', which is not in package.json and resolved only
// because npm hoisted it out of rehype-sanitize's subtree — one pnpm/Yarn-PnP
// or nested install away from breaking the build in this security-critical
// file. rehype-sanitize@6 re-exports it, types included, so the @ts-ignore
// that used to sit here is gone too.
import { defaultSchema } from 'rehype-sanitize';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false, loading: () => <div className="bg-surface-2 animate-pulse h-32 rounded-lg my-3" /> }
);

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
  const imgExisting = getAttrArray(base, 'img');
  return {
    ...base,
    tagNames: Array.from(new Set([...(base.tagNames || []), ...katexAllowedTags, 'img'])),
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
      img: [...imgExisting, 'src', 'alt', 'size'],
    }
  };
})();

/**
 * react-markdown v9 removed the `inline` prop it used to pass to a custom
 * `code` component, and v10 (pinned here) does not pass it either — verified by
 * rendering: the props a `code` renderer receives are exactly `{ node, children }`
 * plus `className` only when the fence carries a language.
 *
 * The old `!inline && match` test therefore collapsed to `match`, which meant an
 * **untagged** fenced block — no `language-*` class, but still a block — fell
 * through to the inline branch and rendered as a stretched pink pill inside a
 * <pre>. `position` cannot separate the two (an indented code block is one line;
 * inline code can span several), so the discriminator is the real one: whether
 * the node was rendered inside a <pre>. react-markdown renders that wrapper
 * through the `pre` component, so it can publish that fact on a context.
 */
const InsideCodeBlock = createContext(false);

function PreRenderer({ children }: { children?: React.ReactNode }) {
  // No <pre> of our own: a highlighted block brings its own container
  // (PreTag="div") and an untagged block renders its own <pre> below.
  return <InsideCodeBlock.Provider value={true}>{children}</InsideCodeBlock.Provider>;
}

function CodeRenderer({
  className,
  children,
  node,
  ...props
}: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode; node?: unknown }) {
  // `node` is react-markdown's hast node. It is pulled out of `props` and
  // dropped on purpose: spreading it onto a DOM element (or onto
  // SyntaxHighlighter, which forwards) puts `node="[object Object]"` in the
  // markup.
  void node;
  const isBlock = useContext(InsideCodeBlock);
  const match = /language-(\w+)/.exec(className || '');

  if (isBlock && match) {
    return (
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
    );
  }

  if (isBlock) {
    return (
      <pre className="bg-surface-2 border border-border rounded-lg my-3 p-3 overflow-x-auto">
        <code className="text-sm font-mono text-foreground" {...props}>
          {children}
        </code>
      </pre>
    );
  }

  return (
    <code className="bg-surface-2 text-brand-primary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  );
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeOptions], rehypeKatex]}
        components={{
          pre: PreRenderer,
          code: CodeRenderer,
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
          img: ({ src, alt, node }) => {
            const sizeAttr = node?.properties?.size;
            const widthPercent = sizeAttr ? parseInt(String(sizeAttr), 10) : 100;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt || ''}
                style={{ width: `${widthPercent}%`, height: 'auto' }}
                className="rounded-lg my-3 max-w-full"
                loading="lazy"
              />
            );
          },
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
