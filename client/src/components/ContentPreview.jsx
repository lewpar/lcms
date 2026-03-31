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
  const [srcDoc, setSrcDoc]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [failed, setFailed]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const prevSignalRef             = useRef(null);

  useEffect(() => {
    // Skip if nothing has changed since last render
    if (prevSignalRef.current === refreshSignal && srcDoc) return;
    prevSignalRef.current = refreshSignal;

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    if (srcDoc) setRefreshing(true);

    previewPage(siteId, page)
      .then(html => {
        if (!cancelled) { setSrcDoc(html); setLoading(false); setRefreshing(false); }
      })
      .catch(() => {
        if (!cancelled) { setFailed(true); setLoading(false); setRefreshing(false); }
      });

    return () => { cancelled = true; };
  }, [refreshSignal, siteId]);

  const isRefreshing = loading && !!srcDoc;

  return (
    <div className="site-preview-view">
      <div className="site-preview-toolbar site-preview-toolbar--label">
        <span className="site-preview-label">
          <span className={`site-preview-gen-dot${loading ? ' site-preview-gen-dot--visible' : ''}`} />
          <span className={`site-preview-label-text${isRefreshing ? ' site-preview-label-text--refreshing' : ''}`}>
            {isRefreshing ? 'Refreshing…' : 'Preview'}
          </span>
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
            srcDoc={srcDoc}
            className="site-preview-iframe site-preview-iframe--loaded"
            title="Content Preview"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}

        <div className={`site-preview-update-toast${isRefreshing ? ' site-preview-update-toast--visible' : ''}`}>
          <span className="site-preview-update-spinner">⟳</span> Refreshing preview…
        </div>
      </div>
    </div>
  );
}
