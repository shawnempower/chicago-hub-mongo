/**
 * Markdown Message Component
 * 
 * Renders markdown-formatted text in chat messages
 */

import React from 'react';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, className = '' }) => {
  // Simple markdown parser for common formatting
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let inList = false;
    let isNumberedList = false;
    let key = 0;

    const flushList = (isNumbered = false) => {
      if (listItems.length > 0) {
        const ListTag = isNumbered ? 'ol' : 'ul';
        const listClass = isNumbered 
          ? "list-decimal list-inside space-y-1 my-2" 
          : "list-disc list-inside space-y-1 my-2";
        
        elements.push(
          React.createElement(
            ListTag,
            { key: `list-${key++}`, className: listClass },
            listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))
          )
        );
        listItems = [];
      }
    };

    const formatInline = (text: string): string => {
      // Bold: **text** or __text__
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      text = text.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>');
      
      // Italic: *text* or _text_
      text = text.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
      text = text.replace(/_(.+?)_/g, '<em class="italic">$1</em>');
      
      // Inline code: `code`
      text = text.replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>');
      
      return text;
    };

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('# ')) {
        flushList(isNumberedList);
        inList = false;
        isNumberedList = false;
        elements.push(
          <h1 key={`h1-${key++}`} className="text-xl font-bold mt-4 mb-2" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
        );
      } else if (line.startsWith('## ')) {
        flushList(isNumberedList);
        inList = false;
        isNumberedList = false;
        elements.push(
          <h2 key={`h2-${key++}`} className="text-lg font-semibold mt-3 mb-2" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(3)) }} />
        );
      } else if (line.startsWith('### ')) {
        flushList(isNumberedList);
        inList = false;
        isNumberedList = false;
        elements.push(
          <h3 key={`h3-${key++}`} className="text-base font-semibold mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formatInline(line.slice(4)) }} />
        );
      }
      // Bullet lists
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        if (inList && isNumberedList) {
          flushList(true);
          inList = false;
        }
        inList = true;
        isNumberedList = false;
        listItems.push(line.trim().slice(2));
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line.trim())) {
        if (inList && !isNumberedList) {
          flushList(false);
          inList = false;
        }
        const match = line.trim().match(/^\d+\.\s(.+)$/);
        if (match) {
          inList = true;
          isNumberedList = true;
          listItems.push(match[1]);
        }
      }
      // Horizontal rule
      else if (line.trim() === '---' || line.trim() === '***') {
        flushList(isNumberedList);
        inList = false;
        isNumberedList = false;
        elements.push(<hr key={`hr-${key++}`} className="my-3 border-border" />);
      }
      // Code blocks
      else if (line.trim().startsWith('```')) {
        flushList(isNumberedList);
        inList = false;
        isNumberedList = false;
        // Simple code block handling (just visual, not full featured)
        elements.push(
          <div key={`code-${key++}`} className="bg-muted p-2 rounded my-2 font-mono text-xs">
            {line.replace(/```/g, '')}
          </div>
        );
      }
      // Empty line
      else if (line.trim() === '') {
        flushList(isNumberedList);
        inList = false;
        isNumberedList = false;
        // Add spacing between paragraphs
        if (elements.length > 0) {
          elements.push(<div key={`space-${key++}`} className="h-2" />);
        }
      }
      // Regular paragraph
      else {
        if (inList) {
          flushList(isNumberedList);
          inList = false;
          isNumberedList = false;
        }
        elements.push(
          <p key={`p-${key++}`} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        );
      }
    });

    // Flush any remaining list items
    flushList(isNumberedList);

    return elements;
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};

