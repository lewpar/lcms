import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { assetsDir } from '../../../../../../lib/paths.js';
import { isSafeFilename, assertWithinDir, safeError, resolveSite } from '../../../../../../lib/validate.js';

export async function DELETE(request, { params }) {
  const { siteId, filename } = params;
  const [, err] = resolveSite(siteId);
  if (err) return err;

  if (!isSafeFilename(filename)) {
    return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
  }
  const dir = assetsDir(siteId);
  const fp = path.join(dir, filename);
  if (!assertWithinDir(fp, dir)) return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
  if (!fs.existsSync(fp)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  try { fs.unlinkSync(fp); return NextResponse.json({ success: true }); }
  catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
