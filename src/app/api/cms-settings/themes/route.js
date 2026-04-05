import { NextResponse } from 'next/server';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { CMS_SETTINGS_FILE } from '../../../../../server/lib/paths.js';
import { safeError } from '../../../../../server/lib/validate.js';

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');
  const settings = read();
  const themes = allThemes(settings);
  const visible = siteId
    ? themes.filter(t => t.shared !== false || t.siteId === siteId)
    : themes.filter(t => t.shared !== false);
  return NextResponse.json(visible);
}

export async function POST(request) {
  try {
    const settings = read();
    const themes = allThemes(settings);
    let body = {};
    try { body = await request.json(); } catch {}
    const { id: _id, name, shared = true, siteId, ...themeProps } = body;
    const theme = {
      ...DEFAULT_THEME,
      ...themeProps,
      id: uuidv4(),
      name: (typeof name === 'string' ? name.trim() : 'Untitled').slice(0, 100) || 'Untitled',
      shared: Boolean(shared),
      ...(typeof siteId === 'string' ? { siteId } : {}),
    };
    write({ ...settings, themes: [...themes, theme] });
    return NextResponse.json(theme, { status: 201 });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
