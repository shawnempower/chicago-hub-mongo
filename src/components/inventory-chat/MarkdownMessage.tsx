/**
 * Markdown Message Component
 * 
 * Renders markdown-formatted text in chat messages
 * Supports: headers, lists, tables, bold, italic, code, links
 */

import React from 'react';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

interface TableData {
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '' }) => {
  
  // Format inline elements (bold, italic, code, links)
  const formatInline = (text: string): string => {
    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
    
    // Bold: **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>');
    
    // Italic: *text* or _text_ (but not inside words)
    text = text.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em class="italic">$1</em>');
    text = text.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em class="italic">$1</em>');
    
    // Inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
    
    // Checkboxes
    text = text.replace(/\[x\]/gi, '<span class="text-green-600">✓</span>');
    text = text.replace(/\[ \]/g, '<span class="text-gray-400">○</span>');
    
    return text;
  };

  // Parse table from lines
  const parseTable = (lines: string[], startIndex: number): { table: TableData; endIndex: number } | null => {
    const headerLine = lines[startIndex];
    const separatorLine = lines[startIndex + 1];
    
    if (!headerLine || !separatorLine) return null;
    
    // Check if this is a table (has pipes and separator row with dashes)
    if (!headerLine.includes('|') || !separatorLine.match(/^[\s|:-]+$/)) return null;
    
    const parseRow = (line: string): string[] => {
      return line
        .split('|')
        .map(cell => cell.trim())
        .filter((_, i, arr) => i > 0 && i < arr.length - (line.endsWith('|') ? 1 : 0) || !line.startsWith('|'));
    };
    
    const headers = parseRow(headerLine);
    
    // Parse alignments from separator
    const alignments: ('left' | 'center' | 'right')[] = parseRow(separatorLine).map(cell => {
      const trimmed = cell.replace(/\s/g, '');
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
      if (trimmed.endsWith(':')) return 'right';
      return 'left';
    });
    
    // Parse data rows
    const rows: string[][] = [];
    let endIndex = startIndex + 2;
    
    while (endIndex < lines.length) {
      const line = lines[endIndex];
      if (!line.includes('|') || line.trim() === '') break;
      rows.push(parseRow(line));
      endIndex++;
    }
    
    return {
      table: { headers, alignments, rows },
      endIndex: endIndex - 1
    };
  };

  // Main parser
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let inList = false;
    let isNumberedList = false;
    let codeBlock: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let key = 0;

    const flushList = (isNumbered = false) => {
      if (listItems.length > 0) {
        const ListTag = isNumbered ? 'ol' : 'ul';
        elements.push(
          React.createElement(
            ListTag,
            { 
              key: `list-${key++}`, 
              className: isNumbered 
                ? "list-decimal list-outside ml-4 space-y-1 my-3" 
                : "list-disc list-outside ml-4 space-y-1 my-3"
            },
            listItems.map((item, idx) => (
              <li key={idx} className="pl-1" dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))
          )
        );
        listItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlock.length > 0) {
        elements.push(
          <div key={`code-${key++}`} className="my-3 rounded-lg overflow-hidden border border-slate-200">
            {codeLanguage && (
              <div className="bg-slate-100 px-3 py-1 text-xs text-slate-500 border-b border-slate-200">
                {codeLanguage}
              </div>
            )}
            <pre className="bg-slate-50 p-3 overflow-x-auto">
              <code className="text-xs font-mono text-slate-800">
                {codeBlock.join('\n')}
              </code>
            </pre>
          </div>
        );
        codeBlock = [];
        codeLanguage = '';
      }
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      
      // Code block handling
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList(isNumberedList);
          inList = false;
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        i++;
        continue;
      }
      
      if (inCodeBlock) {
        codeBlock.push(line);
        i++;
        continue;
      }
      
      // Check for table
      if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^[\s|:-]+$/)) {
        flushList(isNumberedList);
        inList = false;
        
        const tableResult = parseTable(lines, i);
        if (tableResult) {
          const { table, endIndex } = tableResult;
          
          elements.push(
            <div key={`table-${key++}`} className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {table.headers.map((header, idx) => (
                      <th 
                        key={idx} 
                        className={`px-4 py-2.5 font-semibold text-slate-700 text-${table.alignments[idx] || 'left'}`}
                        style={{ textAlign: table.alignments[idx] || 'left' }}
                      >
                        <span dangerouslySetInnerHTML={{ __html: formatInline(header) }} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIdx) => (
                    <tr 
                      key={rowIdx} 
                      className={`border-b border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      {row.map((cell, cellIdx) => (
                        <td 
                          key={cellIdx} 
                          className="px-4 py-2 text-slate-600"
                          style={{ textAlign: table.alignments[cellIdx] || 'left' }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          
          i = endIndex + 1;
          continue;
        }
      }
      
      // Headers
      if (line.startsWith('#### ')) {
        flushList(isNumberedList);
        inList = false;
        elements.push(
          <h4 key={`h4-${key++}`} className="text-sm font-semibold mt-4 mb-2 text-slate-800" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(5)) }} />
        );
      } else if (line.startsWith('### ')) {
        flushList(isNumberedList);
        inList = false;
        elements.push(
          <h3 key={`h3-${key++}`} className="text-base font-semibold mt-4 mb-2 text-slate-800" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(4)) }} />
        );
      } else if (line.startsWith('## ')) {
        flushList(isNumberedList);
        inList = false;
        elements.push(
          <h2 key={`h2-${key++}`} className="text-lg font-semibold mt-5 mb-2 text-slate-900 border-b border-slate-100 pb-1" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(3)) }} />
        );
      } else if (line.startsWith('# ')) {
        flushList(isNumberedList);
        inList = false;
        elements.push(
          <h1 key={`h1-${key++}`} className="text-xl font-bold mt-5 mb-3 text-slate-900" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
        );
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        flushList(isNumberedList);
        inList = false;
        elements.push(
          <blockquote 
            key={`quote-${key++}`} 
            className="border-l-4 border-slate-300 pl-4 py-1 my-3 text-slate-600 italic"
            dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }}
          />
        );
      }
      // Bullet lists (including nested with indentation)
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
        if (inList && isNumberedList) {
          flushList(true);
          inList = false;
        }
        inList = true;
        isNumberedList = false;
        const content = line.trim().replace(/^[-*•]\s+/, '');
        listItems.push(content);
      }
      // Numbered lists
      else if (/^\s*\d+\.\s/.test(line)) {
        if (inList && !isNumberedList) {
          flushList(false);
          inList = false;
        }
        const match = line.trim().match(/^\d+\.\s+(.+)$/);
        if (match) {
          inList = true;
          isNumberedList = true;
          listItems.push(match[1]);
        }
      }
      // Horizontal rule
      else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        flushList(isNumberedList);
        inList = false;
        elements.push(<hr key={`hr-${key++}`} className="my-4 border-slate-200" />);
      }
      // Empty line
      else if (line.trim() === '') {
        flushList(isNumberedList);
        inList = false;
        if (elements.length > 0) {
          elements.push(<div key={`space-${key++}`} className="h-2" />);
        }
      }
      // Regular paragraph
      else {
        if (inList) {
          flushList(isNumberedList);
          inList = false;
        }
        elements.push(
          <p key={`p-${key++}`} className="leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        );
      }
      
      i++;
    }

    // Flush remaining items
    flushList(isNumberedList);
    flushCodeBlock();

    return elements;
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};

