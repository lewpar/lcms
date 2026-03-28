import { useState, useEffect, useRef, useCallback } from 'react';
import { getPages, generateSite } from '../api.js';

/**
 * Unified live site preview used across all CMS editors.
 *
 * Props:
 *   siteId        — required
 *   siteSlug      — required
 *   addToast      — required
 *   pageSlug      — navigate to this page on load/change (default: home)
 *   refreshSignal — increment this number to trigger a regeneration
 */
export default function SitePreview({ siteId, siteSlug, addToast, pageSlug = '', refreshSignal = 0 }) {
  const base = `/site-preview/${siteSlug}`;

  const [pages, setPages]               = useState([]);
  const [generating, setGenerating]     = useState(false);
  const [everGenerated, setEverGenerated] = useState(false);
  const [failed, setFailed]             = useState(false);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [currentSlug, setCurrentSlug]   = useState(pageSlug);
  const [themeMode, setThemeMode]       = useState('light');

  const iframeRef      = useRef(null);
  const prevSignalRef  = useRef(null);   // track last seen refreshSignal
  const prevSiteIdRef  = useRef(null);   // detect site switches

  const iframeSrc = currentSlug ? `${base}/${currentSlug}/` : `${base}/`;

  // ── Helpers ────────────────────────────────────────────

  const applyTheme = useCallback((mode) => {
    try {
      iframeRef.current?.contentDocument?.documentElement?.setAttribute('data-theme', mode);
    } catch {}
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true);
    setFailed(false);
    try {
      await generateSite(siteId);
      setEverGenerated(true);
      setIframeVersion(v => v + 1);
    } catch {
      setFailed(true);
      addToast('Preview generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  }, [siteId, addToast]);

  // ── Effects ────────────────────────────────────────────

  // Load pages for toolbar nav
  useEffect(() => {
    getPages(siteId).then(setPages).catch(() => {});
  }, [siteId]);

  // Initial generation when site changes
  useEffect(() => {
    if (prevSiteIdRef.current === siteId) return;
    prevSiteIdRef.current = siteId;
    setEverGenerated(false);
    setFailed(false);
    setCurrentSlug(pageSlug);
    prevSignalRef.current = refreshSignal; // sync signal so next effect doesn't double-fire
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // Regenerate when parent signals a save (skip initial render)
  useEffect(() => {
    if (prevSignalRef.current === null) {
      prevSignalRef.current = refreshSignal;
      return;
    }
    if (refreshSignal === prevSignalRef.current) return;
    prevSignalRef.current = refreshSignal;
    generate();
  }, [refreshSignal, generate]);

  // Navigate when pageSlug prop changes
  useEffect(() => {
    if (currentSlug === pageSlug) return;
    setCurrentSlug(pageSlug);
    setIframeVersion(v => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSlug]);

  // ── Actions ────────────────────────────────────────────

  const navigate = (slug) => {
    setCurrentSlug(slug);
    setIframeVersion(v => v + 1);
  };

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(next);
    applyTheme(next);
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="site-preview-view">

      {/* Toolbar */}
      <div className="site-preview-toolbar">
        <div className="site-preview-nav">
          <button
            className={`site-preview-nav-btn${currentSlug === '' ? ' active' : ''}`}
            onClick={() => navigate('')}
          >Home</button>
          {pages.map(p => (
            <button
              key={p.id}
              className={`site-preview-nav-btn${currentSlug === p.slug ? ' active' : ''}`}
              onClick={() => navigate(p.slug)}
              title={`/${p.slug}/`}
            >{p.title}</button>
          ))}
        </div>

        <div className="site-preview-toolbar-actions">
          {generating && (
            <span className="site-preview-gen-dot" title="Generating…" />
          )}
          <button
            className={`preview-theme-toggle${themeMode === 'dark' ? ' preview-theme-toggle--dark' : ''}`}
            onClick={toggleTheme}
            title={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            <span className="preview-theme-toggle__icons">
              <span className="preview-theme-toggle__sun">☀</span>
              <span className="preview-theme-toggle__moon">☽</span>
            </span>
            <span className="preview-theme-toggle__thumb" />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={generate}
            disabled={generating}
          >
            {generating ? 'Generating…' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="site-preview-content">
        {/* Initial loading state (no site generated yet) */}
        {!everGenerated && !failed && (
          <div className="site-preview-loading">
            <div className="site-preview-spinner">⟳</div>
            <div>Generating preview…</div>
          </div>
        )}

        {/* Failed state (first generation failed) */}
        {!everGenerated && failed && (
          <div className="site-preview-loading">
            <div style={{ fontSize: 32 }}>⚠</div>
            <div>Generation failed.</div>
            <button className="btn btn-primary btn-sm" onClick={generate}>Try Again</button>
          </div>
        )}

        {/* Iframe — stays visible during subsequent regenerations */}
        {everGenerated && (
          <iframe
            key={`${iframeVersion}:${currentSlug}`}
            ref={iframeRef}
            src={iframeSrc}
            className="site-preview-iframe"
            title="Site Preview"
            onLoad={(e) => { e.target.classList.add('site-preview-iframe--loaded'); applyTheme(themeMode); }}
          />
        )}

        {/* Subtle update overlay shown during background regeneration */}
        {everGenerated && generating && (
          <div className="site-preview-update-toast">
            <span className="site-preview-update-spinner">⟳</span> Updating…
          </div>
        )}
      </div>
    </div>
  );
}
