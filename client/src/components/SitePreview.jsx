import { useState, useEffect, useRef } from 'react';
import { getPages, generateSite } from '../api.js';

export default function SitePreview({ siteId, siteSlug, addToast, initialSlug }) {
  const base = `/site-preview/${siteSlug}`;
  const [pages, setPages] = useState([]);
  const [generating, setGenerating] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeSrc, setIframeSrc] = useState(initialSlug ? `${base}/${initialSlug}/` : `${base}/`);
  const [themeMode, setThemeMode] = useState('light');
  const iframeRef = useRef(null);

  useEffect(() => {
    getPages(siteId).then(setPages).catch(() => {});
    handleGenerate();
  }, [siteId]);

  const applyThemeToIframe = (mode) => {
    try {
      iframeRef.current?.contentDocument?.documentElement?.setAttribute('data-theme', mode);
    } catch {}
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSite(siteId);
      setGenerated(true);
      setIframeKey(k => k + 1);
    } catch (err) {
      addToast('Generation failed: ' + err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const navigate = (slug) => {
    const src = slug ? `${base}/${slug}/` : `${base}/`;
    setIframeSrc(src);
    setIframeKey(k => k + 1);
  };

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    applyThemeToIframe(next);
  };

  return (
    <div className="site-preview-view">
      <div className="site-preview-toolbar">
        <span className="site-preview-title">Preview — {siteSlug}</span>
        <div className="site-preview-nav">
          <button className="site-preview-nav-btn" onClick={() => navigate('')}>Home</button>
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
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            className="site-preview-theme-btn"
            onClick={toggleTheme}
            title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {themeMode === 'light' ? '☽ Dark' : '☀ Light'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '⟳ Generating…' : '↺ Regenerate'}
          </button>
        </div>
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
          onLoad={() => applyThemeToIframe(themeMode)}
        />
      )}
    </div>
  );
}
