import { useState, useEffect } from 'react';

const PRESETS = [
  { name: 'Default',  primary: '#6c63ff', sidebarBg: '#1e293b', radius: 8,  font: 'inter',       fontSize: 16, contentWidth: 800 },
  { name: 'Ocean',    primary: '#0ea5e9', sidebarBg: '#0c1a2e', radius: 8,  font: 'inter',       fontSize: 16, contentWidth: 800 },
  { name: 'Forest',   primary: '#22c55e', sidebarBg: '#0f2617', radius: 8,  font: 'open-sans',   fontSize: 16, contentWidth: 860 },
  { name: 'Sunset',   primary: '#f97316', sidebarBg: '#1c100a', radius: 8,  font: 'lato',        fontSize: 16, contentWidth: 800 },
  { name: 'Rose',     primary: '#f43f5e', sidebarBg: '#1c0a0f', radius: 8,  font: 'inter',       fontSize: 15, contentWidth: 760 },
  { name: 'Purple',   primary: '#a855f7', sidebarBg: '#160d25', radius: 8,  font: 'inter',       fontSize: 16, contentWidth: 800 },
  { name: 'Sharp',    primary: '#334155', sidebarBg: '#0f172a', radius: 0,  font: 'source-sans', fontSize: 15, contentWidth: 900 },
  { name: 'Rounded',  primary: '#6c63ff', sidebarBg: '#1e293b', radius: 16, font: 'inter',       fontSize: 16, contentWidth: 780 },
];

const FONTS = [
  { value: 'system',      label: 'System default' },
  { value: 'inter',       label: 'Inter' },
  { value: 'roboto',      label: 'Roboto' },
  { value: 'lato',        label: 'Lato' },
  { value: 'source-sans', label: 'Source Sans 3' },
  { value: 'open-sans',   label: 'Open Sans' },
];

const FONT_FAMILY = {
  system:      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  inter:       '"Inter", sans-serif',
  roboto:      '"Roboto", sans-serif',
  lato:        '"Lato", sans-serif',
  'source-sans': '"Source Sans 3", sans-serif',
  'open-sans': '"Open Sans", sans-serif',
};

const FONT_URLS = {
  inter:       'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  roboto:      'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  lato:        'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap',
  'source-sans': 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap',
  'open-sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
};

function hexToRgbStr(hex) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  } catch { return '108,99,255'; }
}

function isValidHex(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

// ── Full site layout preview ───────────────────────────

function SiteLayoutPreview({ theme }) {
  const primary = isValidHex(theme.primary || '') ? theme.primary : '#6c63ff';
  const sidebarBg = isValidHex(theme.sidebarBg || '') ? theme.sidebarBg : '#1e293b';
  const r = (theme.radius ?? 8) + 'px';
  const fontFamily = FONT_FAMILY[theme.font || 'inter'] || FONT_FAMILY.inter;
  const fs = Math.max(12, Math.min(22, theme.fontSize || 16));
  const maxW = Math.max(600, Math.min(1300, theme.contentWidth || 800));
  const rgb = hexToRgbStr(primary);
  const showBreadcrumbs = theme.showBreadcrumbs !== false;
  const showReadingTime = theme.showReadingTime !== false;

  const navLink = (active, label) => (
    <div style={{
      padding: '6px 14px', fontSize: 12, fontWeight: active ? 600 : 400,
      color: active ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.5)',
      background: active ? `rgba(${rgb},.2)` : 'transparent',
      borderLeft: `2px solid ${active ? primary : 'transparent'}`,
      cursor: 'default',
    }}>{label}</div>
  );

  const sidebarW = theme.sidebarWidth || 240;

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily, fontSize: fs * 0.82, overflow: 'hidden', background: '#fff' }}>
      {/* Sidebar */}
      <div style={{ width: sidebarW * 0.55, flexShrink: 0, background: sidebarBg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 10px 10px', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, color: '#fff', fontSize: 13, lineHeight: 1.3 }}>My Learning Site</div>
        </div>
        <div style={{ flex: 1, paddingTop: 8 }}>
          {navLink(false, 'Introduction')}
          {navLink(true, 'Chapter 1')}
          {navLink(false, 'Chapter 2')}
          <div style={{ padding: '10px 14px 3px', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,.25)' }}>Advanced</div>
          {navLink(false, 'Deep Dive')}
          {navLink(false, 'References')}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ height: 40, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 16px', background: '#fff', flexShrink: 0, gap: 8 }}>
          {showBreadcrumbs && (
            <div style={{ fontSize: 10, color: '#94a3b8', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ color: primary }}>Home</span>
              <span style={{ color: '#cbd5e1' }}>›</span>
              <span>Chapter 1</span>
              <span style={{ color: '#cbd5e1' }}>›</span>
              <span>Getting Started</span>
            </div>
          )}
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#fff' }}>
          <div style={{ maxWidth: maxW * 0.48, margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.7em', fontWeight: 800, lineHeight: 1.2, color: '#0f172a', marginBottom: 4 }}>Getting Started</h1>
            {showReadingTime && <div style={{ fontSize: '0.78em', color: '#94a3b8', marginBottom: 14 }}>⏱ 5 min read</div>}
            <p style={{ color: '#475569', lineHeight: 1.65, marginBottom: 12, fontSize: '0.95em' }}>
              This is sample body text showing how your content looks with the selected theme. The font, size, and spacing all update as you adjust settings.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <span style={{ background: primary, color: '#fff', padding: '6px 14px', borderRadius: r, fontSize: '0.82em', fontWeight: 700, cursor: 'default' }}>Primary</span>
              <span style={{ border: `1.5px solid ${primary}`, color: primary, padding: '6px 14px', borderRadius: r, fontSize: '0.82em', fontWeight: 700, cursor: 'default' }}>Secondary</span>
            </div>

            {/* Alert */}
            <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: r, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.82em', marginBottom: 3 }}>Important Note</div>
              <div style={{ color: '#374151', fontSize: '0.8em' }}>This is an alert block that draws the reader's attention.</div>
            </div>

            {/* Callout */}
            <div style={{ background: `rgba(${rgb},.07)`, borderLeft: `3px solid ${primary}`, borderRadius: `0 ${r} ${r} 0`, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: primary, fontSize: '0.82em', marginBottom: 3 }}>💡 Callout</div>
              <div style={{ color: '#374151', fontSize: '0.8em' }}>A highlighted tip for the reader.</div>
            </div>

            {/* Code */}
            <div style={{ borderRadius: r, overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: 10 }}>
              <div style={{ background: '#1e293b', color: '#94a3b8', padding: '3px 10px', fontSize: 9, fontFamily: 'monospace' }}>javascript</div>
              <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '8px 10px', margin: 0, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.5, overflowX: 'hidden' }}>{`function greet(name) {\n  return \`Hello, \${name}!\`;\n}`}</pre>
            </div>

            {/* Quiz start */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: r, overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ background: primary, color: '#fff', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 6 }}>Quiz</div>
                <div style={{ fontWeight: 700, fontSize: '0.92em', color: '#0f172a', marginBottom: 8 }}>Chapter 1 Review</div>
                <span style={{ background: primary, color: '#fff', padding: '6px 14px', borderRadius: r, fontSize: '0.8em', fontWeight: 700, cursor: 'default' }}>Start Quiz →</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ThemeView ─────────────────────────────────────

export default function ThemeView({ settings, onSave, addToast }) {
  const defaultTheme = { primary: '#6c63ff', sidebarBg: '#1e293b', radius: 8, font: 'inter', fontSize: 16, contentWidth: 800, sidebarWidth: 240, showBreadcrumbs: true, showReadingTime: true };
  const [theme, setTheme] = useState(() => ({ ...defaultTheme, ...(settings.theme || {}) }));
  const [saving, setSaving] = useState(false);

  // Load Google Font into document when font selection changes
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

  const applyPreset = (preset) => {
    const { name: _n, ...t } = preset;
    setTheme(prev => ({ ...defaultTheme, ...prev, ...t }));
  };

  const set = (key, val) => setTheme(t => ({ ...t, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...settings, theme });
      addToast('Theme saved', 'success');
    } catch {
      addToast('Failed to save theme', 'error');
    } finally {
      setSaving(false);
    }
  };

  const ColorField = ({ label, themeKey }) => (
    <div className="field">
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
    <div className="theme-view-layout">
      {/* ── Left: controls ── */}
      <div className="theme-controls-pane">
        <div className="theme-controls-inner">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Theme</h2>

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

          {/* Colors */}
          <div className="settings-section">
            <h3>Colors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ColorField label="Primary color" themeKey="primary" />
              <ColorField label="Sidebar background" themeKey="sidebarBg" />
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

          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Saving…' : 'Save Theme'}
          </button>
        </div>
      </div>

      {/* ── Right: preview ── */}
      <div className="theme-preview-pane">
        <div className="theme-preview-label">Live Preview</div>
        <div className="theme-preview-frame">
          <SiteLayoutPreview theme={theme} />
        </div>
      </div>
    </div>
  );
}
