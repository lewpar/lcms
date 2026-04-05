'use client';
import { useState, useEffect, useRef } from 'react';
import SitePreview from './SitePreview.jsx';
import SplitPane from './SplitPane.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { getThemes, createTheme, updateTheme, deleteTheme } from '../api.js';
import { FOCUS_DELAY_MS } from '../utils.js';

const DEFAULT_THEME_VALUES = {
  primary: '#6c63ff', sidebarBg: '#1e293b', contentBg: '#ffffff', textColor: '#1e293b',
  darkPrimary: '#7c74ff', darkSidebarBg: '#131925', darkContentBg: '#0f172a', darkTextColor: '#e2e8f0',
  radius: 8, font: 'inter', fontSize: 16, contentWidth: 800, sidebarWidth: 240,
  showBreadcrumbs: true, showReadingTime: true,
};

const FONTS = [
  { value: 'system',      label: 'System default' },
  { value: 'inter',       label: 'Inter' },
  { value: 'roboto',      label: 'Roboto' },
  { value: 'lato',        label: 'Lato' },
  { value: 'source-sans', label: 'Source Sans 3' },
  { value: 'open-sans',   label: 'Open Sans' },
];

const FONT_URLS = {
  inter:         'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  roboto:        'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  lato:          'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  'source-sans': 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap',
  'open-sans':   'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
};

const COLOR_FIELDS = [
  { label: 'Primary',            lightKey: 'primary',    darkKey: 'darkPrimary'    },
  { label: 'Sidebar background', lightKey: 'sidebarBg',  darkKey: 'darkSidebarBg'  },
  { label: 'Content background', lightKey: 'contentBg',  darkKey: 'darkContentBg'  },
  { label: 'Text',               lightKey: 'textColor',  darkKey: 'darkTextColor'  },
];

function isValidHex(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function ColorPickerRow({ label, value, onChange }) {
  return (
    <div className="field" style={{ margin: 0 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={isValidHex(value || '') ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          style={{ width: 38, height: 30, padding: 2, cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0 }}
        />
        <input
          type="text"
          value={value || ''}
          onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
          maxLength={7}
        />
      </div>
    </div>
  );
}

function themeValues(t) {
  // Strip metadata fields, returning only theme style properties
  const { id: _i, name: _n, shared: _s, siteId: _si, ...values } = t;
  return values;
}

export default function ThemeView({ settings, onSave, addToast, siteId, siteSlug }) {
  const [themes, setThemes]             = useState([]);
  const [selectedId, setSelectedId]     = useState(settings.themeId || 'default');
  const [theme, setTheme]               = useState({ ...DEFAULT_THEME_VALUES, ...(settings.theme || {}) });
  const [saveStatus, setSaveStatus]     = useState('saved');
  const [previewKey, setPreviewKey]     = useState(0);
  const [colorTab, setColorTab]         = useState('light');
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [newName, setNewName]           = useState('');
  const [newShared, setNewShared]       = useState(true);
  const [creating, setCreating]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // theme object to confirm delete

  const saveTimer      = useRef(null);
  const isFirstLoad    = useRef(true);
  const onSaveRef      = useRef(onSave);
  const settingsRef    = useRef(settings);
  const latestThemeRef = useRef(theme);
  const selectedIdRef  = useRef(selectedId);
  const nameInputRef   = useRef(null);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { latestThemeRef.current = theme; }, [theme]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Load Google Font for preview
  useEffect(() => {
    const existing = document.getElementById('theme-preview-font');
    if (existing) existing.remove();
    if (FONT_URLS[theme.font]) {
      const link = document.createElement('link');
      link.id = 'theme-preview-font';
      link.rel = 'stylesheet';
      link.href = FONT_URLS[theme.font];
      document.head.appendChild(link);
    }
  }, [theme.font]);

  // Load CMS-wide themes on mount
  useEffect(() => {
    setLoading(true);
    getThemes(siteId)
      .then(data => {
        setThemes(data);
        const targetId = settings.themeId || 'default';
        const match = data.find(t => t.id === targetId) || data.find(t => t.id === 'default') || data[0];
        if (match) {
          selectedIdRef.current = match.id;
          setSelectedId(match.id);
          setTheme({ ...DEFAULT_THEME_VALUES, ...themeValues(match) });
        }
      })
      .catch(() => addToast('Failed to load themes', 'error'))
      .finally(() => setLoading(false));
  // addToast and settings are intentionally omitted — they would cause the theme list to
  // reload on every render; siteId is the only meaningful trigger for fetching themes.
  }, [siteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on theme change (1s debounce)
  const THEME_AUTOSAVE_MS = 1000;
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const t = latestThemeRef.current;
        const id = selectedIdRef.current;
        // Default theme is built-in (not on disk) — only persist to site settings
        if (id !== 'default') {
          await updateTheme(id, t);
          setThemes(prev => prev.map(th => th.id === id ? { ...th, ...t } : th));
        }
        await onSaveRef.current({ ...settingsRef.current, theme: t, themeId: id });
        setSaveStatus('saved');
        setPreviewKey(k => k + 1);
      } catch {
        addToast('Failed to save theme', 'error');
        setSaveStatus('error');
      }
    }, THEME_AUTOSAVE_MS);
    return () => clearTimeout(saveTimer.current);
  // theme is the only dep — onSaveRef/settingsRef/latestThemeRef/selectedIdRef are refs
  // so they never invalidate the debounce, yet always hold the latest values when the timer fires.
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectTheme = (t) => {
    clearTimeout(saveTimer.current);
    setSaveStatus('saved');
    selectedIdRef.current = t.id;
    setSelectedId(t.id);
    isFirstLoad.current = true; // suppress auto-save triggered by this state change
    setTheme({ ...DEFAULT_THEME_VALUES, ...themeValues(t) });
  };

  const openDialog = () => {
    setNewName('');
    setNewShared(true);
    setDialogOpen(true);
    setTimeout(() => nameInputRef.current?.focus(), FOCUS_DELAY_MS);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setNewName('');
    setNewShared(true);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await createTheme({
        name,
        shared: newShared,
        siteId,
        ...DEFAULT_THEME_VALUES,
      });
      setThemes(prev => [...prev, created]);
      selectTheme(created);
      closeDialog();
      addToast(`Theme "${created.name}" created`, 'success');
    } catch {
      addToast('Failed to create theme', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    const t = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteTheme(t.id);
      setThemes(prev => prev.filter(th => th.id !== t.id));
      if (selectedIdRef.current === t.id) {
        const fallback = themes.find(th => th.id === 'default') || themes.find(th => th.id !== t.id);
        if (fallback) selectTheme(fallback);
      }
      addToast(`Theme "${t.name}" deleted`, 'success');
    } catch {
      addToast('Failed to delete theme', 'error');
    }
  };

  const set = (key, val) => setTheme(t => ({ ...t, [key]: val }));

  const statusLabel = { saved: '✓ Saved', saving: '⟳ Saving…', error: '✕ Save failed' };
  const statusColor = { saved: 'var(--success)', saving: 'var(--text-muted)', error: 'var(--danger)' };

  const selectedTheme = themes.find(t => t.id === selectedId);

  return (
    <>
      <SplitPane
        storageKey="theme-editor"
        defaultLeftPct={36}
        minLeftPct={22}
        maxLeftPct={65}
        className="theme-view-layout"
        left={<div className="theme-controls-pane">
          <div className="theme-controls-inner">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Theme</h2>
              <span style={{ fontSize: 11, color: statusColor[saveStatus] }}>{statusLabel[saveStatus]}</span>
            </div>

            {/* CMS-wide notice */}
            <div className="theme-cms-note">
              <span style={{ fontSize: 15 }}>🌐</span>
              <span>Themes are CMS-wide — a theme created in any site is available across all your sites.</span>
            </div>

            {/* Theme list */}
            <div className="settings-section">
              <h3>Themes</h3>
              {loading ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Loading…</div>
              ) : (
                <div className="theme-list">
                  {themes.map(t => (
                    <div key={t.id} className={`theme-list-item${selectedId === t.id ? ' active' : ''}`} onClick={() => selectTheme(t)}>
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.primary || '#6c63ff', display: 'block' }} />
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.sidebarBg || '#1e293b', display: 'block', border: '1px solid rgba(0,0,0,.12)' }} />
                      </div>
                      <span className="theme-list-item-name">{t.name}</span>
                      {t.id === 'default' && <span className="theme-list-badge theme-list-badge-builtin">Built-in</span>}
                      {t.id !== 'default' && t.shared === false && <span className="theme-list-badge">Private</span>}
                      {t.id !== 'default' && (
                        <button
                          className="theme-list-delete"
                          title={`Delete "${t.name}"`}
                          onClick={e => { e.stopPropagation(); setDeleteTarget(t); }}
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={openDialog}>
                + Create Theme
              </button>
            </div>

            {/* Editor — locked when Default theme is selected */}
            {selectedId === 'default' && (
              <div className="theme-locked-notice">
                The Default theme is read-only. <button className="btn-link" onClick={openDialog}>Create a theme</button> to make changes.
              </div>
            )}
            <fieldset disabled={selectedId === 'default'} className={`theme-editor-fields${selectedId === 'default' ? ' theme-editor-locked' : ''}`}>

              {/* Colors */}
              <div className="settings-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h3 style={{ margin: 0 }}>Colors{selectedTheme ? <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>— {selectedTheme.name}</span> : ''}</h3>
                  <div className="color-tab-bar">
                    <button className={`color-tab-btn${colorTab === 'light' ? ' active' : ''}`} onClick={() => setColorTab('light')}>☀ Light</button>
                    <button className={`color-tab-btn${colorTab === 'dark' ? ' active' : ''}`} onClick={() => setColorTab('dark')}>☽ Dark</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {COLOR_FIELDS.map(({ label, lightKey, darkKey }) => {
                    const key = colorTab === 'light' ? lightKey : darkKey;
                    return <ColorPickerRow key={lightKey} label={label} value={theme[key]} onChange={val => set(key, val)} />;
                  })}
                </div>
              </div>

              {/* Typography */}
              <div className="settings-section">
                <h3>Typography</h3>
                <div className="field">
                  <label>Body font</label>
                  <select value={theme.font || 'inter'} onChange={e => set('font', e.target.value)}>
                    {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Base font size — {theme.fontSize || 16}px</label>
                  <input type="range" min={13} max={19} value={theme.fontSize || 16} onChange={e => set('fontSize', Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>Compact (13)</span><span>Large (19)</span>
                  </div>
                </div>
              </div>

              {/* Shape */}
              <div className="settings-section">
                <h3>Shape</h3>
                <div className="field">
                  <label>Border radius — {theme.radius ?? 8}px</label>
                  <input type="range" min={0} max={20} value={theme.radius ?? 8} onChange={e => set('radius', Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>Sharp (0)</span><span>Very rounded (20)</span>
                  </div>
                </div>
              </div>

              {/* Layout */}
              <div className="settings-section">
                <h3>Layout</h3>
                <div className="field">
                  <label>Content max-width — {theme.contentWidth || 800}px</label>
                  <input type="range" min={600} max={1200} step={20} value={theme.contentWidth || 800} onChange={e => set('contentWidth', Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>Narrow (600)</span><span>Wide (1200)</span>
                  </div>
                </div>
                <div className="field">
                  <label>Sidebar width — {theme.sidebarWidth || 240}px</label>
                  <input type="range" min={180} max={320} step={10} value={theme.sidebarWidth || 240} onChange={e => set('sidebarWidth', Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>Narrow (180)</span><span>Wide (320)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label className="theme-toggle-row">
                    <input type="checkbox" checked={theme.showBreadcrumbs !== false} onChange={e => set('showBreadcrumbs', e.target.checked)} />
                    <span>Show breadcrumb navigation</span>
                  </label>
                  <label className="theme-toggle-row">
                    <input type="checkbox" checked={theme.showReadingTime !== false} onChange={e => set('showReadingTime', e.target.checked)} />
                    <span>Show reading time</span>
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
        </div>}
        right={<div className="theme-preview-pane">
          <SitePreview refreshSignal={previewKey} siteId={siteId} siteSlug={siteSlug} addToast={addToast} />
        </div>}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Theme"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone. Sites using this theme will keep their current appearance.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Create Theme dialog */}
      {dialogOpen && (
        <div className="modal-backdrop" onClick={closeDialog}>
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="create-theme-title" onClick={e => e.stopPropagation()} style={{ width: 360 }}>
            <h3 id="create-theme-title" className="modal-dialog-title">Create Theme</h3>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Theme name</label>
              <input
                ref={nameInputRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. My Brand Theme"
                maxLength={100}
                onKeyDown={e => e.key === 'Enter' && !creating && newName.trim() && handleCreate()}
              />
            </div>
            <label className="theme-toggle-row" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={newShared} onChange={e => setNewShared(e.target.checked)} />
              <span>Visible to other sites</span>
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
              When enabled, this theme will be available across all sites in this CMS.
            </p>
            <div className="modal-dialog-actions">
              <button className="btn btn-secondary" onClick={closeDialog} disabled={creating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? 'Creating…' : 'Create Theme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
