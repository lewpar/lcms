import { useState, useEffect, useRef } from 'react';
import SitePreview from './SitePreview.jsx';
import SplitPane from './SplitPane.jsx';

const PRESETS = [
  {
    name: 'Default',
    primary: '#6c63ff', sidebarBg: '#1e293b', contentBg: '#ffffff', textColor: '#1e293b',
    darkPrimary: '#7c74ff', darkSidebarBg: '#131925', darkContentBg: '#0f172a', darkTextColor: '#e2e8f0',
    radius: 8, font: 'inter', fontSize: 16, contentWidth: 800,
  },
  {
    name: 'Ocean',
    primary: '#0ea5e9', sidebarBg: '#0c1a2e', contentBg: '#ffffff', textColor: '#0c1a2e',
    darkPrimary: '#38bdf8', darkSidebarBg: '#061018', darkContentBg: '#0a1628', darkTextColor: '#e0f2fe',
    radius: 8, font: 'inter', fontSize: 16, contentWidth: 800,
  },
  {
    name: 'Forest',
    primary: '#22c55e', sidebarBg: '#0f2617', contentBg: '#f7fdf8', textColor: '#0f2617',
    darkPrimary: '#4ade80', darkSidebarBg: '#071610', darkContentBg: '#0d1f12', darkTextColor: '#dcfce7',
    radius: 8, font: 'open-sans', fontSize: 16, contentWidth: 860,
  },
  {
    name: 'Sunset',
    primary: '#f97316', sidebarBg: '#1c100a', contentBg: '#fffaf7', textColor: '#1c0f0a',
    darkPrimary: '#fb923c', darkSidebarBg: '#140c06', darkContentBg: '#1a0e06', darkTextColor: '#fed7aa',
    radius: 8, font: 'lato', fontSize: 16, contentWidth: 800,
  },
  {
    name: 'Rose',
    primary: '#f43f5e', sidebarBg: '#1c0a0f', contentBg: '#fff7f9', textColor: '#1c0a0f',
    darkPrimary: '#fb7185', darkSidebarBg: '#14060a', darkContentBg: '#1a0a0f', darkTextColor: '#fce7f3',
    radius: 8, font: 'inter', fontSize: 15, contentWidth: 760,
  },
  {
    name: 'Purple',
    primary: '#a855f7', sidebarBg: '#160d25', contentBg: '#fdfaff', textColor: '#160d25',
    darkPrimary: '#c084fc', darkSidebarBg: '#0e0818', darkContentBg: '#0f0a1e', darkTextColor: '#f3e8ff',
    radius: 8, font: 'inter', fontSize: 16, contentWidth: 800,
  },
  {
    name: 'Sharp',
    primary: '#334155', sidebarBg: '#0f172a', contentBg: '#ffffff', textColor: '#0f172a',
    darkPrimary: '#64748b', darkSidebarBg: '#07090e', darkContentBg: '#0a0d12', darkTextColor: '#cbd5e1',
    radius: 0, font: 'source-sans', fontSize: 15, contentWidth: 900,
  },
  {
    name: 'Rounded',
    primary: '#6c63ff', sidebarBg: '#1e293b', contentBg: '#ffffff', textColor: '#1e293b',
    darkPrimary: '#7c74ff', darkSidebarBg: '#131925', darkContentBg: '#0f172a', darkTextColor: '#e2e8f0',
    radius: 16, font: 'inter', fontSize: 16, contentWidth: 780,
  },
];

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

function isValidHex(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

const COLOR_FIELDS = [
  { label: 'Primary',            lightKey: 'primary',    darkKey: 'darkPrimary'    },
  { label: 'Sidebar background', lightKey: 'sidebarBg',  darkKey: 'darkSidebarBg'  },
  { label: 'Content background', lightKey: 'contentBg',  darkKey: 'darkContentBg'  },
  { label: 'Text',               lightKey: 'textColor',  darkKey: 'darkTextColor'  },
];

export default function ThemeView({ settings, onSave, addToast, siteId, siteSlug }) {
  const defaultTheme = {
    primary: '#6c63ff', sidebarBg: '#1e293b', contentBg: '#ffffff', textColor: '#1e293b',
    darkPrimary: '#7c74ff', darkSidebarBg: '#131925', darkContentBg: '#0f172a', darkTextColor: '#e2e8f0',
    radius: 8, font: 'inter', fontSize: 16, contentWidth: 800, sidebarWidth: 240,
    showBreadcrumbs: true, showReadingTime: true,
  };
  const [theme, setTheme] = useState(() => ({ ...defaultTheme, ...(settings.theme || {}) }));
  const [saveStatus, setSaveStatus] = useState('saved');
  const [previewKey, setPreviewKey] = useState(0);
  const [colorTab, setColorTab] = useState('light'); // 'light' | 'dark'

  const saveTimer = useRef(null);
  const isFirstLoad = useRef(true);
  const onSaveRef = useRef(onSave);
  const settingsRef = useRef(settings);
  const latestThemeRef = useRef(theme);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { latestThemeRef.current = theme; }, [theme]);

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

  // Auto-save on theme change (1s debounce) — show "Saving…" immediately
  useEffect(() => {
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onSaveRef.current({ ...settingsRef.current, theme: latestThemeRef.current });
        setSaveStatus('saved');
        setPreviewKey(k => k + 1);
      } catch {
        addToast('Failed to save theme', 'error');
        setSaveStatus('saved');
      }
    }, 1000);
    return () => clearTimeout(saveTimer.current);
  }, [theme]);

  const applyPreset = (preset) => {
    const { name: _n, ...t } = preset;
    setTheme(prev => ({ ...defaultTheme, ...prev, ...t }));
  };

  const set = (key, val) => setTheme(t => ({ ...t, [key]: val }));

  const statusLabel = { saved: '✓ Saved', saving: '⟳ Saving…' };
  const statusColor = { saved: 'var(--success)', saving: 'var(--text-muted)' };

  const ColorPickerRow = ({ label, themeKey }) => (
    <div className="field" style={{ margin: 0 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="color"
          value={isValidHex(theme[themeKey] || '') ? theme[themeKey] : '#000000'}
          onChange={e => set(themeKey, e.target.value)}
          style={{ width: 38, height: 30, padding: 2, cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border)', flexShrink: 0 }}
        />
        <input
          type="text"
          value={theme[themeKey] || ''}
          onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set(themeKey, e.target.value)}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
          maxLength={7}
        />
      </div>
    </div>
  );

  return (
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

          {/* Presets */}
          <div className="settings-section">
            <h3>Presets</h3>
            <div className="theme-presets">
              {PRESETS.map(preset => (
                <button key={preset.name} className="theme-preset-btn" onClick={() => applyPreset(preset)} title={preset.name}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: preset.primary, display: 'block' }} />
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: preset.sidebarBg, display: 'block', border: '1px solid rgba(255,255,255,.1)' }} />
                  </div>
                  <span className="theme-preset-name">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Colors — tabbed light / dark */}
          <div className="settings-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Colors</h3>
              <div className="color-tab-bar">
                <button
                  className={`color-tab-btn${colorTab === 'light' ? ' active' : ''}`}
                  onClick={() => setColorTab('light')}
                >☀ Light</button>
                <button
                  className={`color-tab-btn${colorTab === 'dark' ? ' active' : ''}`}
                  onClick={() => setColorTab('dark')}
                >☽ Dark</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {COLOR_FIELDS.map(({ label, lightKey, darkKey }) => (
                <ColorPickerRow
                  key={lightKey}
                  label={label}
                  themeKey={colorTab === 'light' ? lightKey : darkKey}
                />
              ))}
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
        </div>
      </div>}
      right={<div className="theme-preview-pane">
        <SitePreview key={previewKey} siteId={siteId} siteSlug={siteSlug} addToast={addToast} initialSlug="" />
      </div>}
    />
  );
}
