import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { read, write, allThemes, DEFAULT_THEME } from '../../../../lib/cms-settings.js';
import { safeError } from '../../../../lib/validate.js';

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
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
