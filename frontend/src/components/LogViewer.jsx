import { useEffect, useRef } from 'react';
import './LogViewer.css';

export default function LogViewer({ lines }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="log-viewer">
      {lines.length === 0 ? (
        <span className="log-empty">awaiting output...</span>
      ) : (
        lines.map((line, i) => (
          <div key={i} className="log-line">
            <span className="log-prefix">&gt;</span>
            <span className="log-text">{line}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
