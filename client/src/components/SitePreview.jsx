import { useState, useEffect, useRef } from 'react';
import { getPages, generateSite } from '../api.js';

export default function SitePreview({ addToast }) {
  const [pages, setPages] = useState([]);
  const [generating, setGenerating] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeSrc, setIframeSrc] = useState('/site-preview/');
  const iframeRef = useRef(null);

  useEffect(() => {
    getPages().then(setPages).catch(() => {});
    handleGenerate();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSite();
      setGenerated(true);
      setIframeKey(k => k + 1);
    } catch (err) {
      addToast('Generation failed: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const navigate = (slug) => {
    const src = slug ? `/site-preview/${slug}/` : '/site-preview/';
    setIframeSrc(src);
    setIframeKey(k => k + 1);
  };

  return (
    <div className="site-preview-view">
      <div className="site-preview-toolbar">
        <span className="site-preview-title">Site Preview</span>
        <div className="site-preview-nav">
          <button
            className="site-preview-nav-btn"
            onClick={() => navigate('')}
          >
            Home
          </button>
          {pages.map(p => (
            <button
              key={p.id}
              className="site-preview-nav-btn"
              onClick={() => navigate(p.slug)}
              title={`/${p.slug}/`}
            >
              {p.title}
            </button>
          ))}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleGenerate}
          disabled={generating}
          style={{ flexShrink: 0 }}
        >
          {generating ? '⟳ Generating…' : '↺ Regenerate'}
        </button>
      </div>

      {generating ? (
        <div className="site-preview-loading">
          <div className="site-preview-spinner">⟳</div>
          <div>Generating site preview…</div>
        </div>
      ) : !generated ? (
        <div className="site-preview-loading">
          <div>Failed to generate. Check console for errors.</div>
          <button className="btn btn-primary" onClick={handleGenerate}>Try Again</button>
        </div>
      ) : (
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={iframeSrc}
          className="site-preview-iframe"
          title="Site Preview"
        />
      )}
    </div>
  );
}
