import { useEffect, useRef } from 'react';

interface Props {
  content: string;
}

export default function DiagramRenderer({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect diagram type
  const isMermaid = content.includes('```mermaid') || 
    content.match(/graph\s+(TD|LR|TB|RL|BT)/i) ||
    content.match(/sequenceDiagram|classDiagram|stateDiagram|flowchart/i);

  const isTable = content.includes('|') && content.match(/\|.*\|.*\|/);
  const isAsciiArt = content.includes('┌') || content.includes('│') || content.includes('└') ||
    content.includes('╔') || content.includes('║') || content.includes('╚') ||
    content.includes('+--') || content.includes('|--');

  useEffect(() => {
    if (isMermaid && containerRef.current) {
      // Dynamically load mermaid if needed
      renderMermaid();
    }
  }, [content, isMermaid]);

  async function renderMermaid() {
    if (!containerRef.current) return;
    
    // Check if mermaid is already loaded
    if (!(window as any).mermaid) {
      // Load mermaid dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.onload = () => {
        (window as any).mermaid.initialize({ 
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict'
        });
        doRender();
      };
      document.head.appendChild(script);
    } else {
      doRender();
    }
  }

  async function doRender() {
    if (!containerRef.current) return;
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;

    // Extract mermaid code
    let code = content;
    const match = content.match(/```mermaid\s*([\s\S]*?)```/);
    if (match) {
      code = match[1].trim();
    }

    // Clear and render
    containerRef.current.replaceChildren();
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = code;
    containerRef.current.appendChild(div);

    try {
      await mermaid.run(undefined, div);
    } catch (e) {
      console.error('Mermaid render error:', e);
      // Fallback to pre
      const pre = document.createElement('pre');
      pre.style.cssText = 'font-size:0.75rem;overflow-x:auto;white-space:pre';
      pre.textContent = code;
      containerRef.current.replaceChildren(pre);
    }
  }

  // Render as markdown table
  if (isTable && !isMermaid) {
    return (
      <div ref={containerRef} style={{ overflowX: 'auto' }}>
        <MarkdownTable content={content} />
      </div>
    );
  }

  // Render as ASCII art / preformatted
  if (isAsciiArt || (!isMermaid && !isTable)) {
    return (
      <div ref={containerRef}>
        <pre style={{
          fontSize: '0.7rem',
          lineHeight: 1.5,
          margin: 0,
          padding: '8px',
          background: '#f8fafc',
          borderRadius: 6,
          overflowX: 'auto',
          fontFamily: "'Courier New', Consolas, monospace",
          color: '#334155',
          whiteSpace: 'pre',
        }}>
          {content.replace(/```\w*\n?/g, '').replace(/```/g, '').trim()}
        </pre>
      </div>
    );
  }

  // Render as Mermaid
  if (isMermaid) {
    return (
      <div 
        ref={containerRef} 
        style={{ 
          textAlign: 'center', 
          padding: '8px',
          background: '#f8fafc',
          borderRadius: 6,
          overflowX: 'auto'
        }}
      />
    );
  }

  // Fallback
  return (
    <div ref={containerRef}>
      <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap', margin: 0 }}>{content}</pre>
    </div>
  );
}

// Simple markdown table renderer
function MarkdownTable({ content }: { content: string }) {
  const lines = content.split('\n').filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
  if (lines.length < 2) {
    return <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>{content}</pre>;
  }

  // Parse header
  const parseRow = (line: string) => 
    line.split('|').slice(1, -1).map(cell => cell.trim());

  const headers = parseRow(lines[0]);
  // Skip separator line (line with ---)
  const dataLines = lines.slice(2).filter(l => !l.match(/^\|[\s-|]+\|$/));

  return (
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '0.7rem',
      fontFamily: 'inherit',
    }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{
              background: '#e2e8f0',
              padding: '6px 8px',
              textAlign: 'left',
              fontWeight: 700,
              color: '#1e293b',
              borderBottom: '2px solid #94a3b8',
              whiteSpace: 'nowrap',
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataLines.map((line, rowIdx) => {
          const cells = parseRow(line);
          return (
            <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#f8fafc' }}>
              {cells.map((cell, colIdx) => (
                <td key={colIdx} style={{
                  padding: '5px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#334155',
                }}>{cell}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
