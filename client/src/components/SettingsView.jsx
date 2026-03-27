import { useState, useEffect, useRef } from 'react';
import SitePreview from './SitePreview.jsx';
import SplitPane from './SplitPane.jsx';

export default function SettingsView({ settings, onSave, addToast, siteId, siteSlug }) {
  const [local, setLocal] = useState(() => ({ title: '', navPages: [], ...settings }));
  const [saveStatus, setSaveStatus] = useState('saved');
  const [previewKey, setPreviewKey] = useState(0);

  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);
  const onSaveRef = useRef(onSave);
  const latestRef = useRef(local);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { latestRef.current = local; }, [local]);

  // Auto-save on change (1s debounce)
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSaveRef.current(latestRef.current);
        setSaveStatus('saved');
        setPreviewKey(k => k + 1);
      } catch {
        addToast('Failed to save settings', 'error');
        setSaveStatus('saved');
      }
    }, 1000);
    return () => clearTimeout(saveTimer.current);
  }, [local]);

  const pages = settings._pages || [];

  const isInNav = (slug) => local.navPages.length === 0 || local.navPages.includes(slug);

  const toggleNav = (slug) => {
    setLocal(s => {
      let navPages = s.navPages.length === 0
        ? pages.map(p => p.slug)
        : [...s.navPages];
      if (navPages.includes(slug)) {
        navPages = navPages.filter(x => x !== slug);
      } else {
        navPages = [...navPages, slug];
      }
      return { ...s, navPages };
    });
  };

  const moveNav = (slug, dir) => {
    setLocal(s => {
      const navPages = s.navPages.length === 0
        ? pages.map(p => p.slug)
        : [...s.navPages];
      const idx = navPages.indexOf(slug);
      if (idx === -1) return s;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= navPages.length) return s;
      [navPages[idx], navPages[newIdx]] = [navPages[newIdx], navPages[idx]];
      return { ...s, navPages };
    });
  };

  const handleIncludeAll = () => setLocal(s => ({ ...s, navPages: [] }));

  const included = local.navPages.length === 0
    ? pages.map(p => p.slug)
    : local.navPages.filter(slug => pages.find(p => p.slug === slug));

  const excluded = pages.map(p => p.slug).filter(slug => !included.includes(slug));
  const orderedSlugs = [...included, ...excluded];
  const pageBySlug = Object.fromEntries(pages.map(p => [p.slug, p]));

  const statusLabel = { saved: '✓ Saved', saving: '⟳ Saving…' };
  const statusColor = { saved: 'var(--success)', saving: 'var(--text-muted)' };

  return (
    <SplitPane
      storageKey="settings-editor"
      defaultLeftPct={36}
      minLeftPct={22}
      maxLeftPct={65}
      className="settings-split-layout"
      left={<div className="settings-controls-pane">
        <div className="settings-controls-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Site Settings</h2>
            <span style={{ fontSize: 11, color: statusColor[saveStatus] }}>{statusLabel[saveStatus]}</span>
          </div>

          {/* General */}
          <div className="settings-section">
            <h3>General</h3>
            <div className="field">
              <label>Site name</label>
              <input
                type="text"
                value={local.title || ''}
                onChange={e => setLocal(s => ({ ...s, title: e.target.value }))}
                placeholder="My Learning Site"
              />
            </div>
            <div className="field">
              <label>Site description (shown on home page)</label>
              <input
                type="text"
                value={local.description || ''}
                onChange={e => setLocal(s => ({ ...s, description: e.target.value }))}
                placeholder="A brief description of this learning site"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="settings-section">
            <h3>Navigation</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Choose which pages appear in the exported site's navigation bar and set their order.
            </p>

            {pages.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No pages yet.</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleIncludeAll}
                    disabled={local.navPages.length === 0}
                  >
                    Include all pages
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {local.navPages.length === 0
                      ? 'All pages included (default)'
                      : `${included.length} of ${pages.length} included`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {orderedSlugs.map((slug) => {
                    const page = pageBySlug[slug];
                    if (!page) return null;
                    const inNav = isInNav(slug);
                    const navIdx = included.indexOf(slug);

                    return (
                      <div key={slug} className="nav-page-item" style={{ opacity: inNav ? 1 : 0.5 }}>
                        <input
                          type="checkbox"
                          checked={inNav}
                          onChange={() => toggleNav(slug)}
                          id={`nav-${slug}`}
                        />
                        <label htmlFor={`nav-${slug}`} style={{ flex: 1, cursor: 'pointer' }}>
                          <div className="nav-page-title">{page.title}</div>
                          <div className="nav-page-slug">/{page.slug}</div>
                        </label>
                        {inNav && (
                          <div className="nav-page-move">
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              disabled={navIdx === 0}
                              onClick={() => moveNav(slug, -1)}
                              title="Move up in nav"
                            >↑</button>
                            <button
                              className="btn btn-secondary btn-sm btn-icon"
                              disabled={navIdx === included.length - 1}
                              onClick={() => moveNav(slug, 1)}
                              title="Move down in nav"
                            >↓</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Custom Header */}
          <div className="settings-section">
            <h3>Custom Header</h3>
            <div className="field">
              <label>Custom header HTML</label>
              <textarea
                rows={4}
                value={local.header || ''}
                onChange={e => setLocal(s => ({ ...s, header: e.target.value }))}
                placeholder="<div>My custom header</div>"
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Rendered above page content on every page. Supports HTML.
              </span>
            </div>
          </div>

          {/* Custom Footer */}
          <div className="settings-section">
            <h3>Custom Footer</h3>
            <div className="field">
              <label>Custom footer HTML</label>
              <textarea
                rows={4}
                value={local.footer || ''}
                onChange={e => setLocal(s => ({ ...s, footer: e.target.value }))}
                placeholder="<div>© 2026 My Company</div>"
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Replaces the default footer text. Supports HTML.
              </span>
            </div>
          </div>
        </div>
      </div>}
      right={<div className="theme-preview-pane">
        <SitePreview key={previewKey} siteId={siteId} siteSlug={siteSlug} addToast={addToast} initialSlug="" />
      </div>}
    />
  );
}
