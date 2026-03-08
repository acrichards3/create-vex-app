import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  content: string;
}

const extractText = (node: React.ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return React.Children.toArray(props.children).map(extractText).join("");
  }
  if (Array.isArray(node)) return node.map(extractText).join("");
  return "";
};

const generateId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = React.useState(false);

  // Extract code text content from React children
  const extractCodeText = (node: React.ReactNode): string => {
    if (typeof node === "string") {
      return node;
    }
    if (typeof node === "number") {
      return String(node);
    }
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode };
      if (node.type === "code") {
        return React.Children.toArray(props.children).map(extractCodeText).join("");
      }
      return React.Children.toArray(props.children).map(extractCodeText).join("");
    }
    if (Array.isArray(node)) {
      return node.map(extractCodeText).join("");
    }
    return "";
  };

  const codeText = extractCodeText(children);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <div className="relative group mb-4">
      <pre className="bg-black/30 rounded-lg overflow-x-auto border border-violet-500/20 p-4">
        <code className="block text-gray-200 font-mono text-sm whitespace-pre">{children}</code>
      </pre>
      <button
        className={`absolute top-3 right-3 px-3 py-1.5 rounded text-xs font-semibold transition-colors duration-200 cursor-pointer ${
          copied
            ? "bg-green-500/30 hover:bg-green-500/40 border border-green-400 text-green-200"
            : "bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300"
        }`}
        onClick={handleCopy}
        type="button"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
};

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-violet max-w-none">
      <ReactMarkdown
        components={{
          a: ({ children, href }) => (
            <a
              className="text-violet-400 hover:text-violet-300 underline transition-colors"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-violet-500/40 pl-4 italic text-gray-300 mb-4">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (!isInline) {
              return <code>{children}</code>;
            }
            return (
              <code className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
            );
          },
          h1: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h1 className="text-5xl py-5 font-bold text-white drop-shadow-md mb-6 mt-8 first:mt-0" id={id}>
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h2 className="text-4xl py-5 font-bold text-white drop-shadow-md mb-4 mt-8" id={id}>
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h3 className="text-3xl py-5 font-bold text-white drop-shadow-md mb-3 mt-6" id={id}>
                {children}
              </h3>
            );
          },
          h4: ({ children }) => {
            const text = extractText(children);
            const id = generateId(text);
            return (
              <h4 className="text-2xl py-5 font-bold text-white drop-shadow-md mb-2 mt-4" id={id}>
                {children}
              </h4>
            );
          },
          hr: () => <hr className="border-violet-500/20 my-8" />,
          li: ({ children }) => <li className="text-gray-300 text-lg">{children}</li>,
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-gray-300 text-lg mb-4 space-y-2 ml-4">{children}</ol>
          ),
          p: ({ children }) => {
            const parts = React.Children.toArray(children);
            const text = parts.map((p) => (typeof p === "string" ? p : "")).join("");
            // If a paragraph contains only non‑breaking spaces, treat it as a spacer.
            if (text && text.replace(/\u00A0/g, "").trim().length === 0) {
              return <div aria-hidden="true" className="h-10 md:h-16" />;
            }
            return <p className="text-gray-300 py-2 text-lg leading-relaxed mb-6">{children}</p>;
          },
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left border-collapse">{children}</table>
            </div>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          td: ({ children }) => (
            <td className="text-gray-300 text-base border-b border-violet-500/10 px-4 py-3">{children}</td>
          ),
          th: ({ children }) => (
            <th className="text-white text-base font-semibold border-b border-violet-500/30 px-4 py-3">{children}</th>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tr: ({ children }) => <tr>{children}</tr>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-gray-300 text-lg mb-4 space-y-2 ml-4">{children}</ul>
          ),
        }}
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
