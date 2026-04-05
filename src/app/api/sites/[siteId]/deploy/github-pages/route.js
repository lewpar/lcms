import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readSites, DOCS_DIR } from '../../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../../lib/validate.js';

export async function DELETE(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  const site = readSites().find(s => s.id === siteId);
  if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  try {
    const deployDir = path.join(DOCS_DIR, site.slug);
    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
