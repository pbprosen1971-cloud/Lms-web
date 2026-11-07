/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink, Quote } from 'lucide-react';

interface ArticleContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight, secure, semantic Markdown & Rich Text parser for Medha Exam Articles.
 * Handles headings, tables, blockquotes, lists, links, images, and formatting with Tailwind styling.
 */
export default function ArticleContentRenderer({ content, className = '' }: ArticleContentRendererProps) {
  if (!content) {
    return <div className="text-slate-400 italic py-4">কোনো কনটেন্ট যোগ করা হয়নি।</div>;
  }

  // Split content into blocks (paragraphs, headings, lists, tables, quotes, images)
  const blocks: React.ReactNode[] = [];
  const lines = content.split('\n');
  let i = 0;

  // Helper to parse inline styles (bold, italic, links, code)
  const parseInline = (text: string): React.ReactNode => {
    if (!text) return null;

    // Pattern for markdown links: [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    // Pattern for inline code: `code`
    // Pattern for bold: **bold**
    // Pattern for italic: *italic* or _italic_

    // Replace links first with tokens or tokenize
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // A simple regex tokenizer for inline elements:
    // 1: links [text](url)
    // 2: bold **text**
    // 3: italic *text*
    // 4: inline code `code`
    const combinedRegex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // Link: [text](url)
        const linkText = match[2];
        const linkUrl = match[3];
        parts.push(
          <a
            key={`link-${match.index}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-emerald-500 underline font-semibold transition-colors inline-flex items-center gap-0.5"
          >
            <span>{linkText}</span>
            <ExternalLink className="h-3 w-3 inline opacity-70" />
          </a>
        );
      } else if (match[4]) {
        // Bold: **text**
        parts.push(
          <strong key={`b-${match.index}`} className="font-bold text-slate-900 dark:text-white">
            {match[5]}
          </strong>
        );
      } else if (match[6]) {
        // Italic: *text*
        parts.push(
          <em key={`i-${match.index}`} className="italic text-slate-700 dark:text-slate-200">
            {match[7]}
          </em>
        );
      } else if (match[8]) {
        // Code: `code`
        parts.push(
          <code
            key={`c-${match.index}`}
            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono text-sm rounded border border-slate-200 dark:border-slate-700"
          >
            {match[9]}
          </code>
        );
      }

      lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Headings (# H1, ## H2, ### H3, #### H4)
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        if (level === 1 || level === 2) {
          blocks.push(
            <h2
              key={`h-${i}`}
              className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-8 mb-4 tracking-tight border-b border-slate-200/80 dark:border-slate-700/80 pb-2.5 flex items-center gap-2"
            >
              <span className="w-1.5 h-6 bg-primary rounded-full inline-block shrink-0" />
              <span>{parseInline(headingText)}</span>
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3
              key={`h-${i}`}
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-6 mb-3 flex items-center gap-2"
            >
              <span className="w-1 h-4 bg-emerald-500 rounded-full inline-block shrink-0" />
              <span>{parseInline(headingText)}</span>
            </h3>
          );
        } else {
          blocks.push(
            <h4
              key={`h-${i}`}
              className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mt-5 mb-2"
            >
              {parseInline(headingText)}
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // 3. Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      blocks.push(
        <hr key={`hr-${i}`} className="my-8 border-t border-slate-200 dark:border-slate-700" />
      );
      i++;
      continue;
    }

    // 4. Standalone Image: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const altText = imgMatch[1];
      const imgUrl = imgMatch[2];
      blocks.push(
        <figure key={`img-${i}`} className="my-6 text-center">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900 shadow-sm max-w-2xl mx-auto">
            <img
              src={imgUrl}
              alt={altText || 'Article illustration'}
              className="w-full h-auto object-contain max-h-[500px] mx-auto transition-transform duration-300 hover:scale-[1.01]"
              loading="lazy"
            />
          </div>
          {altText && (
            <figcaption className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
              {altText}
            </figcaption>
          )}
        </figure>
      );
      i++;
      continue;
    }

    // 5. Blockquote (> quote)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <div
          key={`quote-${i}`}
          className="my-5 p-4 sm:p-5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-slate-800 dark:text-slate-200 flex items-start gap-3 shadow-xs"
        >
          <Quote className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5 opacity-80" />
          <div className="space-y-1.5 text-base sm:text-lg italic font-medium leading-relaxed">
            {quoteLines.map((ql, qidx) => (
              <p key={qidx}>{parseInline(ql)}</p>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // 6. Markdown Table: starts with | and next line has | --- |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        // Check if second line is separator
        const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(tableLines[1]);
        const startRow = isSeparator ? 2 : 1;
        const rowData = tableLines.slice(startRow).map((rowLine) =>
          rowLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        blocks.push(
          <div key={`table-${i}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-sm text-slate-800 dark:text-slate-200 divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-xs uppercase font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  {headerCells.map((th, thIdx) => (
                    <th key={thIdx} className="px-4 py-3 font-semibold">
                      {parseInline(th)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60 bg-white dark:bg-slate-900/60">
                {rowData.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 leading-relaxed">
                        {parseInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 7. Bullet Lists (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-4 space-y-2.5 pl-2 list-none">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Numbered Lists (1. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-4 space-y-2.5 pl-2 list-none counter-reset-item">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-emerald-400 font-bold text-xs shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{parseInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 9. Regular Paragraph
    blocks.push(
      <p
        key={`p-${i}`}
        className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed my-3 font-normal"
      >
        {parseInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`article-prose space-y-2 ${className}`}>{blocks}</div>;
}
