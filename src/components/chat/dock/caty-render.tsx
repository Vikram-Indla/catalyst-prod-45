/**
 * Lightweight markdown renderer for Caty responses.
 * Handles: paragraphs, **bold**, `code`, [text](url), bulleted/numbered lists,
 * and GitHub-style pipe tables — rendered as the structured Rovo-style card.
 *
 * Not a full markdown engine. Tuned for Gemini's typical structured output.
 */
import React from 'react';

const KEY_RE = /^[A-Z]{2,10}-\d+$/;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Order matters: links first, then bold, then code
  const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(text.slice(lastIdx, m.index));
    }
    if (m[1]) {
      // Link
      nodes.push(<a key={`${keyPrefix}-l-${idx++}`} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>);
    } else if (m[4]) {
      nodes.push(<strong key={`${keyPrefix}-b-${idx++}`}>{m[5]}</strong>);
    } else if (m[6]) {
      nodes.push(<code key={`${keyPrefix}-c-${idx++}`}>{m[7]}</code>);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
  return nodes;
}

function renderKeyCell(text: string, idx: number, onKeyClick?: (key: string) => void): React.ReactNode {
  const cleaned = text.trim();
  if (KEY_RE.test(cleaned)) {
    return (
      <a
        key={idx}
        className="cp-table__key-link"
        href={`/issue/${cleaned}`}
        onClick={(e) => {
          if (onKeyClick) {
            e.preventDefault();
            onKeyClick(cleaned);
          }
        }}
      >
        {cleaned}
      </a>
    );
  }
  return <span key={idx}>{renderInline(cleaned, `kc-${idx}`)}</span>;
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function tryParseTable(lines: string[], startIdx: number): { table: ParsedTable; endIdx: number } | null {
  const headerLine = lines[startIdx];
  const sepLine = lines[startIdx + 1];
  if (!headerLine?.includes('|') || !sepLine?.match(/^\s*\|?\s*[-:]/)) return null;

  const headers = headerLine.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
  if (headers.length < 2) return null;

  const rows: string[][] = [];
  let i = startIdx + 2;
  while (i < lines.length && lines[i].includes('|')) {
    const cells = lines[i].split('|').map((c) => c.trim()).filter((c, idx, arr) => idx > 0 || c.length > 0);
    // Remove leading empty cell from leading pipe
    if (cells.length > 0 && cells[0] === '') cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    if (cells.length === 0) break;
    rows.push(cells);
    i++;
  }
  if (rows.length === 0) return null;
  return { table: { headers, rows }, endIdx: i - 1 };
}

export function renderCatyContent(content: string, onKeyClick?: (key: string) => void): React.ReactNode {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty
    if (!line.trim()) { i++; continue; }

    // Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\s*\|?\s*[-:]/)) {
      const parsed = tryParseTable(lines, i);
      if (parsed) {
        const isKeyColumn = (idx: number) =>
          parsed.table.headers[idx]?.toLowerCase() === 'key';
        blocks.push(
          <div key={key++} className="cp-table-wrap">
            <table className="cp-table">
              <thead>
                <tr>
                  {parsed.table.headers.map((h, hi) => <th key={hi}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsed.table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>
                        {isKeyColumn(ci) ? renderKeyCell(cell, ci, onKeyClick) : renderInline(cell, `c-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = parsed.endIdx + 1;
        continue;
      }
    }

    // Bulleted list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      let liKey = 0;
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(<li key={liKey++}>{renderInline(text, `li-${liKey}`)}</li>);
        i++;
      }
      blocks.push(<ul key={key++}>{items}</ul>);
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      let liKey = 0;
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*\d+\.\s+/, '');
        items.push(<li key={liKey++}>{renderInline(text, `oli-${liKey}`)}</li>);
        i++;
      }
      blocks.push(<ol key={key++}>{items}</ol>);
      continue;
    }

    // Plain paragraph (collect until blank line)
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].includes('|') && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      blocks.push(<p key={key++}>{renderInline(paragraphLines.join(' '), `p-${key}`)}</p>);
    }
  }

  return <div className="cp-ai-content">{blocks}</div>;
}
