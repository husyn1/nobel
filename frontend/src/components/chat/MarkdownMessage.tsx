"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Props {
  content: string;
  isStudent?: boolean;
}

function sanitize(text: string): string {
  return (
    text
      // Replace <br> / <br/> inside table cells with a space
      .replace(/<br\s*\/?>/gi, " ")
      // Remove any remaining HTML tags
      .replace(/<[^>]+>/g, "")
      // Normalise \( \) LaTeX to $ $ so remark-math picks it up
      .replace(/\\\(/g, "$").replace(/\\\)/g, "$")
      // Normalise \[ \] to $$ $$
      .replace(/\\\[/g, "$$").replace(/\\\]/g, "$$")
  );
}

export default function MarkdownMessage({ content, isStudent = false }: Props) {
  const clean = sanitize(content);

  return (
    <div className={`markdown-body text-sm leading-relaxed ${isStudent ? "markdown-student" : "markdown-ai"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Headings
          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,

          // Paragraphs
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,

          // Lists
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,

          // Horizontal rule
          hr: () => <hr className={`my-3 border-t ${isStudent ? "border-white/20" : "border-slate-200"}`} />,

          // Code
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code
                className={`px-1.5 py-0.5 rounded text-[0.82em] font-mono ${
                  isStudent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"
                }`}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className="block font-mono text-xs" {...props}>{children}</code>
            ),

          pre: ({ children }) => (
            <pre
              className={`rounded-xl p-4 my-2 overflow-x-auto text-xs font-mono ${
                isStudent ? "bg-white/10 text-white" : "bg-slate-900 text-slate-100"
              }`}
            >
              {children}
            </pre>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote
              className={`border-l-4 pl-4 italic my-2 ${
                isStudent ? "border-white/40 text-white/80" : "border-brand-300 text-slate-600"
              }`}
            >
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={isStudent ? "bg-white/10" : "bg-slate-50"}>{children}</thead>
          ),
          th: ({ children }) => (
            <th className={`px-3 py-2 text-left font-semibold border-b ${isStudent ? "border-white/20 text-white" : "border-slate-200 text-slate-700"}`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`px-3 py-2 border-b ${isStudent ? "border-white/10 text-white/90" : "border-slate-100 text-slate-700"}`}>
              {children}
            </td>
          ),
          tr: ({ children }) => <tr>{children}</tr>,

          // Strong / em
          strong: ({ children }) => (
            <strong className={`font-semibold ${isStudent ? "text-white" : "text-slate-900"}`}>
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          // Links
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer"
              className={`underline ${isStudent ? "text-blue-200" : "text-brand-600"}`}>
              {children}
            </a>
          ),
        }}
      >
        {clean}
      </ReactMarkdown>
    </div>
  );
}
