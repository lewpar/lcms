import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pagesDir, ensureDirs, isReservedSlug, readSites } from '../../../../../lib/paths.js';
import { isValidId, safeError, sanitisePage } from '../../../../../lib/validate.js';
import { safePagePath, slugExists } from '../../../../../lib/pages.js';

export async function GET(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  const dir = pagesDir(siteId);
  if (!fs.existsSync(dir)) return NextResponse.json([]);
  try {
    const pages = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
          return { id: d.id, title: d.title, slug: d.slug, section: d.section || '', updatedAt: d.updatedAt, order: d.order, icon: d.icon || '' };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aHasOrder = a.order != null;
        const bHasOrder = b.order != null;
        if (aHasOrder && bHasOrder) return a.order - b.order;
        if (aHasOrder) return -1;
        if (bHasOrder) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });
    return NextResponse.json(pages);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  ensureDirs(siteId);
  let rawBody = {};
  try { rawBody = await request.json(); } catch {}
  const id = uuidv4();
  const now = new Date().toISOString();
  const body = sanitisePage(rawBody);
  const slug = body.slug || id;

  if (isReservedSlug(slug)) return NextResponse.json({ error: `"${slug}" is a reserved slug and cannot be used.` }, { status: 400 });
  if (slugExists(siteId, slug)) return NextResponse.json({ error: `A page with slug "${slug}" already exists.` }, { status: 409 });

  const page = { id, title: body.title || 'Untitled', slug, section: body.section || '', description: '', blocks: [], createdAt: now, updatedAt: now };
  try {
    fs.writeFileSync(path.join(pagesDir(siteId), `${id}.json`), JSON.stringify(page, null, 2));
    return NextResponse.json(page);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
