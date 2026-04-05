import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pagesDir, isReservedSlug, readSites } from '../../../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../../../lib/validate.js';
import { safePagePath, slugExists } from '../../../../../../../lib/pages.js';

export async function POST(request, { params }) {
  const { siteId, id } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  const fp = safePagePath(siteId, `${id}.json`);
  if (!fp) return NextResponse.json({ error: 'Invalid page ID.' }, { status: 400 });
  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  try {
    const existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const newId = uuidv4();
    const now = new Date().toISOString();
    const baseSlug = existing.slug + '-copy';
    let slug = baseSlug;
    let counter = 2;
    while (isReservedSlug(slug) || slugExists(siteId, slug)) {
      slug = `${baseSlug}-${counter++}`;
    }
    const copy = { ...existing, id: newId, title: existing.title + ' (copy)', slug, createdAt: now, updatedAt: now };
    fs.writeFileSync(path.join(pagesDir(siteId), `${newId}.json`), JSON.stringify(copy, null, 2));
    return NextResponse.json(copy);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
