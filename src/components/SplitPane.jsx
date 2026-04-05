'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Horizontal resizable split pane.
 * Renders left + right children separated by a draggable divider.
 * Persists the split position to localStorage when storageKey is provided.
 */
export default function SplitPane({
  left,
  right,
  defaultLeftPct = 42,
  minLeftPct = 18,
  maxLeftPct = 78,
  storageKey,
  className = '',
}) {
  const [leftPct, setLeftPct] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`split:${storageKey}`);
      if (stored) {
        const n = parseFloat(stored);
        if (!isNaN(n)) return Math.min(maxLeftPct, Math.max(minLeftPct, n));
      }
    }
    return defaultLeftPct;
  });

  const containerRef = useRef(null);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Persist on change
  useEffect(() => {
    if (storageKey) localStorage.setItem(`split:${storageKey}`, String(leftPct));
  }, [leftPct, storageKey]);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    setIsDragging(true);

    const onMouseMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(Math.min(maxLeftPct, Math.max(minLeftPct, raw)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [minLeftPct, maxLeftPct]);

  return (
    <div
      ref={containerRef}
      className={`split-pane ${className} ${isDragging ? 'split-pane--dragging' : ''}`.trim()}
    >
      <div className="split-pane__left" style={{ width: `${leftPct}%` }}>
        {left}
      </div>

      <div
        className={`split-pane__divider ${isDragging ? 'split-pane__divider--active' : ''}`}
        onMouseDown={onMouseDown}
        title="Drag to resize"
      >
        <div className="split-pane__handle" />
      </div>

      <div className="split-pane__right" style={{ width: `${100 - leftPct}%` }}>
        {right}
      </div>
    </div>
  );
}
