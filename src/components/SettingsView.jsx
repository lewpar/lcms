'use client';
import { useState, useEffect, useRef } from 'react';
import SitePreview from './SitePreview.jsx';
import SplitPane from './SplitPane.jsx';

export default function SettingsView({ settings, onSave, addToast, siteId, siteSlug }) {
  const [local, setLocal] = useState(() => ({ title: '', ...settings }));
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
        setSaveStatus('error');
      }
    }, 1000);
    return () => clearTimeout(saveTimer.current);
  }, [local]);

  const statusLabel = { saved: '✓ Saved', saving: '⟳ Saving…', error: '✕ Save failed' };
  const statusColor = { saved: 'var(--success)', saving: 'var(--text-muted)', error: 'var(--danger)' };

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
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!local.disableNav}
                  onChange={e => setLocal(s => ({ ...s, disableNav: e.target.checked }))}
                  style={{ width: 'auto', margin: 0 }}
                />
                Disable navigation sidebar
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Hides the sidebar and top bar. Useful for single-page sites that only use the home page.
              </span>
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!local.floatingDarkMode}
                  onChange={e => setLocal(s => ({ ...s, floatingDarkMode: e.target.checked }))}
                  style={{ width: 'auto', margin: 0 }}
                />
                Show floating dark mode button
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                Adds a fixed dark/light mode toggle button in the corner of the exported site.
              </span>
            </div>
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
        <SitePreview refreshSignal={previewKey} siteId={siteId} siteSlug={siteSlug} addToast={addToast} />
      </div>}
    />
  );
}
