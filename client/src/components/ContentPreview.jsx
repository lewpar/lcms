import { useState, useEffect, useRef } from 'react';
import { previewPage } from '../api.js';

/**
 * Minimal live preview for a single page's content (blocks only).
 * Used in PageEditor and HomeEditor instead of the full SitePreview.
 *
 * Props:
 *   siteId        — required
 *   page          — { title, blocks } — current editor state
 *   refreshSignal — increment to trigger a new preview render
 */
export default function ContentPreview({ siteId, page, refreshSignal = 0 }) {
  const [srcDoc, setSrcDoc]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [failed, setFailed]     = useState(false);
  const prevSignalRef           = useRef(null);

  useEffect(() => {
    // Skip if nothing has changed since last render
    if (prevSignalRef.current === refreshSignal && srcDoc) return;
    prevSignalRef.current = refreshSignal;

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    previewPage(siteId, page)
      .then(html => {
        if (!cancelled) { setSrcDoc(html); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setFailed(true); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [refreshSignal, siteId]);

  return (
    <div className="site-preview-view">
      <div className="site-preview-toolbar site-preview-toolbar--label">
        <span className="site-preview-label">
          {loading && <span className="site-preview-gen-dot" title="Generating…" />}
          Preview
        </span>
      </div>

      <div className="site-preview-content">
        {loading && !srcDoc && (
          <div className="site-preview-loading">
            <div className="site-preview-spinner">⟳</div>
            <div>Generating preview…</div>
          </div>
        )}

        {!loading && failed && (
          <div className="site-preview-loading">
            <div style={{ fontSize: 28 }}>⚠</div>
            <div>Preview failed.</div>
          </div>
        )}

        {srcDoc && (
          <iframe
            key={refreshSignal}
            srcDoc={srcDoc}
            className="site-preview-iframe site-preview-iframe--loaded"
            title="Content Preview"
            sandbox="allow-scripts"
          />
        )}

        {srcDoc && loading && (
          <div className="site-preview-update-toast">
            <span className="site-preview-update-spinner">⟳</span> Updating…
          </div>
        )}
      </div>
    </div>
  );
}
