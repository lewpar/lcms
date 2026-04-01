'use strict';

const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = require('express').Router();
const { CMS_SETTINGS_FILE } = require('../lib/paths');
const { safeError } = require('../lib/validate');

const DEFAULTS = { baseUrl: '', themes: [] };

const DEFAULT_THEME = {
  id: 'default',
  name: 'Default',
  shared: true,
  primary: '#6c63ff', sidebarBg: '#1e293b', contentBg: '#ffffff', textColor: '#1e293b',
  darkPrimary: '#7c74ff', darkSidebarBg: '#131925', darkContentBg: '#0f172a', darkTextColor: '#e2e8f0',
  radius: 8, font: 'inter', fontSize: 16, contentWidth: 800, sidebarWidth: 240,
  showBreadcrumbs: true, showReadingTime: true,
};

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CMS_SETTINGS_FILE, 'utf-8')) }; }
  catch { return { ...DEFAULTS }; }
}

function write(data) {
  fs.writeFileSync(CMS_SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function allThemes(settings) {
  const stored = settings.themes || [];
  if (!stored.find(t => t.id === 'default')) return [DEFAULT_THEME, ...stored];
  return stored;
}

// ── CMS settings ─────────────────────────────────────────

router.get('/', (req, res) => {
  res.json(read());
});

router.put('/', (req, res) => {
  try {
    const existing = read();
    const baseUrl = typeof req.body.baseUrl === 'string'
      ? req.body.baseUrl.trim().replace(/\/+$/, '').slice(0, 500)
      : existing.baseUrl;
    const updated = { ...existing, baseUrl };
    write(updated);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// ── Themes ───────────────────────────────────────────────

router.get('/themes', (req, res) => {
  const settings = read();
  const { siteId } = req.query;
  const themes = allThemes(settings);
  // Return shared themes + private themes belonging to the requesting site
  const visible = siteId
    ? themes.filter(t => t.shared !== false || t.siteId === siteId)
    : themes.filter(t => t.shared !== false);
  res.json(visible);
});

router.post('/themes', (req, res) => {
  try {
    const settings = read();
    const themes = allThemes(settings);
    const { id: _id, name, shared = true, siteId, ...themeProps } = req.body;
    const theme = {
      ...DEFAULT_THEME,
      ...themeProps,
      id: uuidv4(),
      name: (typeof name === 'string' ? name.trim() : 'Untitled').slice(0, 100) || 'Untitled',
      shared: Boolean(shared),
      ...(typeof siteId === 'string' ? { siteId } : {}),
    };
    write({ ...settings, themes: [...themes, theme] });
    res.status(201).json(theme);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.put('/themes/:id', (req, res) => {
  try {
    const settings = read();
    const themes = allThemes(settings);
    const idx = themes.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Theme not found' });
    const { id: _id, ...updates } = req.body;
    const updated = { ...themes[idx], ...updates, id: req.params.id };
    if (typeof updated.name === 'string') updated.name = updated.name.trim().slice(0, 100) || updated.name;
    themes[idx] = updated;
    write({ ...settings, themes });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

router.delete('/themes/:id', (req, res) => {
  try {
    if (req.params.id === 'default') return res.status(400).json({ error: 'Cannot delete the default theme' });
    const settings = read();
    const themes = allThemes(settings).filter(t => t.id !== req.params.id);
    write({ ...settings, themes });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
