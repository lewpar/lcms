import { NextResponse } from 'next/server';
import { read, write, allThemes } from '../../../../../lib/cms-settings.js';
import { safeError } from '../../../../../lib/validate.js';

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
    if (typeof updated.name === 'string') {
      const trimmed = updated.name.trim().slice(0, 100);
      updated.name = trimmed || themes[idx].name; // fall back to existing name, not raw input
    }
    themes[idx] = updated;
    // Only persist non-default themes; the default theme is always derived at read time
    write({ ...settings, themes: themes.filter(t => t.id !== 'default') });
    return NextResponse.json(updated);
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (id === 'default') return NextResponse.json({ error: 'Cannot delete the default theme' }, { status: 400 });
    const settings = read();
    const themes = allThemes(settings).filter(t => t.id !== id);
    write({ ...settings, themes: themes.filter(t => t.id !== 'default') });
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
