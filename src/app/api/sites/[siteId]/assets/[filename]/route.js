import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { assetsDir, readSites } from '../../../../../../../server/lib/paths.js';
import { isValidId, isSafeFilename, assertWithinDir, safeError } from '../../../../../../../server/lib/validate.js';

export async function DELETE(request, { params }) {
  const { siteId, filename } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  if (!isSafeFilename(filename)) {
    return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
  }
  const dir = assetsDir(siteId);
  const fp = path.join(dir, filename);
  if (!assertWithinDir(fp, dir)) return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  try { fs.unlinkSync(fp); return NextResponse.json({ success: true }); }
  catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
