import { NextResponse } from 'next/server';
import fs from 'fs';
import { CMS_SETTINGS_FILE } from '../../../../../lib/paths.js';
import { safeError } from '../../../../../lib/validate.js';

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

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const settings = read();
    const themes = allThemes(settings);
    const idx = themes.findIndex(t => t.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    let body = {};
    try { body = await request.json(); } catch {}
    const { id: _id, ...updates } = body;
    const updated = { ...themes[idx], ...updates, id };
    if (typeof updated.name === 'string') updated.name = updated.name.trim().slice(0, 100) || updated.name;
    themes[idx] = updated;
    write({ ...settings, themes });
    return NextResponse.json(updated);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (id === 'default') return NextResponse.json({ error: 'Cannot delete the default theme' }, { status: 400 });
    const settings = read();
    const themes = allThemes(settings).filter(t => t.id !== id);
    write({ ...settings, themes });
    return NextResponse.json({ ok: true });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
