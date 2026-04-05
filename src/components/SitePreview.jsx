'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateSite } from '../api.js';

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

  const [generating, setGenerating]       = useState(false);
  const [everGenerated, setEverGenerated] = useState(false);
  const [failed, setFailed]               = useState(false);
  const [iframeVersion, setIframeVersion] = useState(0);
  const [currentSlug, setCurrentSlug]     = useState(pageSlug);

  const iframeRef     = useRef(null);
  const prevSignalRef = useRef(null);
  const prevSiteIdRef = useRef(null);
  const generateRef   = useRef(null);

  const iframeSrc = `${currentSlug ? `${base}/${currentSlug}/` : `${base}/`}?v=${iframeVersion}`;

  // ── Helpers ────────────────────────────────────────────

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

  useEffect(() => { generateRef.current = generate; }, [generate]);

  // ── Effects ────────────────────────────────────────────

  // Initial generation when site changes
  useEffect(() => {
    if (prevSiteIdRef.current === siteId) return;
    prevSiteIdRef.current = siteId;
    setEverGenerated(false);
    setFailed(false);
    setCurrentSlug(pageSlug);
    prevSignalRef.current = refreshSignal;
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
    generateRef.current();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  // Navigate when pageSlug prop changes
  useEffect(() => {
    if (currentSlug === pageSlug) return;
    setCurrentSlug(pageSlug);
    setIframeVersion(v => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSlug]);

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="site-preview-view">

      {/* Toolbar */}
      <div className="site-preview-toolbar site-preview-toolbar--label">
        <span className="site-preview-label">
          {generating && <span className="site-preview-gen-dot" title="Generating…" />}
          Preview
        </span>
      </div>

      {/* Content */}
      <div className="site-preview-content">
        {!everGenerated && !failed && (
          <div className="site-preview-loading">
            <div className="site-preview-spinner">⟳</div>
            <div>Generating preview…</div>
          </div>
        )}

        {!everGenerated && failed && (
          <div className="site-preview-loading">
            <div style={{ fontSize: 32 }}>⚠</div>
            <div>Generation failed.</div>
            <button className="btn btn-primary btn-sm" onClick={generate}>Try Again</button>
          </div>
        )}

        {everGenerated && (
          <iframe
            key={`${iframeVersion}:${currentSlug}`}
            ref={iframeRef}
            src={iframeSrc}
            className="site-preview-iframe"
            title="Site Preview"
            onLoad={(e) => e.target.classList.add('site-preview-iframe--loaded')}
          />
        )}

        {everGenerated && generating && (
          <div className="site-preview-update-toast">
            <span className="site-preview-update-spinner">⟳</span> Updating…
          </div>
        )}
      </div>
    </div>
  );
}
