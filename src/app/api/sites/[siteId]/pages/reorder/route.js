import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pagesDir, readSites } from '../../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../../lib/validate.js';
import { safePagePath } from '../../../../../../lib/pages.js';

const MAX_REORDER_IDS = 1000;

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  let body = {};
  try { body = await request.json(); } catch {}
  const { ids } = body;
  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids must be an array.' }, { status: 400 });
  if (ids.length > MAX_REORDER_IDS) return NextResponse.json({ error: `Cannot reorder more than ${MAX_REORDER_IDS} pages at once.` }, { status: 400 });
  if (ids.some(id => !isValidId(id))) return NextResponse.json({ error: 'All IDs must be valid UUIDs.' }, { status: 400 });

  try {
    for (let i = 0; i < ids.length; i++) {
      const fp = safePagePath(siteId, `${ids[i]}.json`);
      if (!fp || !fs.existsSync(fp)) {
        return NextResponse.json({ error: `Page not found: ${ids[i]}` }, { status: 400 });
      }
      const page = JSON.parse(fs.readFileSync(fp, 'utf-8'));
      page.order = i;
      fs.writeFileSync(fp, JSON.stringify(page, null, 2));
    }
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
