'use strict';

const fs = require('fs');
const { CMS_SETTINGS_FILE } = require('./paths');

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

// Injects the immutable DEFAULT_THEME if it isn't persisted.
// Never persist DEFAULT_THEME to disk — it is always derived at read time.
function allThemes(settings) {
  const stored = settings.themes || [];
  if (!stored.find(t => t.id === 'default')) return [DEFAULT_THEME, ...stored];
  return stored;
}

module.exports = { DEFAULTS, DEFAULT_THEME, read, write, allThemes };
