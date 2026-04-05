import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pagesDir, isReservedSlug, readSites } from '../../../../../../lib/paths.js';
import { isValidId, safeError, sanitisePage } from '../../../../../../lib/validate.js';
import { safePagePath, slugExists } from '../../../../../../lib/pages.js';

export async function GET(request, { params }) {
  const { siteId, id } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  const fp = safePagePath(siteId, `${id}.json`);
  if (!fp) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  try { return NextResponse.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); }
  catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function PUT(request, { params }) {
  const { siteId, id } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  const fp = safePagePath(siteId, `${id}.json`);
  if (!fp) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  let rawBody = {};
  try { rawBody = await request.json(); } catch {}
  const body = sanitisePage(rawBody);
  if (body.slug && isReservedSlug(body.slug)) return NextResponse.json({ error: `"${body.slug}" is a reserved slug and cannot be used.` }, { status: 400 });
  if (body.slug && slugExists(siteId, body.slug, id)) return NextResponse.json({ error: `A page with slug "${body.slug}" already exists.` }, { status: 409 });

  try {
    const existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const updated = { ...existing, ...body, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    fs.writeFileSync(fp, JSON.stringify(updated, null, 2));
    return NextResponse.json(updated);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  const { siteId, id } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  const fp = safePagePath(siteId, `${id}.json`);
  if (!fp) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  try { fs.unlinkSync(fp); return NextResponse.json({ success: true }); }
  catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
