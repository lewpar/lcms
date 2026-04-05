import { readSites, ROOT } from '../../../../../../lib/paths.js';
import { isValidId } from '../../../../../../lib/validate.js';
import { NextResponse } from 'next/server';
import { renderPagePreview } from '../../../../../../generator/index.js';

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  let body = {};
  try { body = await request.json(); } catch {}
  const { page } = body;
  if (!page) return NextResponse.json({ error: 'page is required' }, { status: 400 });

  try {
    const html = renderPagePreview(page, siteId, ROOT);
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Preview generation failed' }, { status: 500 });
  }
}
