import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { assetsDir, readSites } from '../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../lib/validate.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

export async function GET(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  const dir = assetsDir(siteId);
  if (!fs.existsSync(dir)) return NextResponse.json([]);
  try {
    const files = fs.readdirSync(dir)
      .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(f => {
        const fp = path.join(dir, f);
        const stat = fs.statSync(fp);
        return { filename: f, url: `/assets/${siteId}/${f}`, size: stat.size, createdAt: stat.birthtime.toISOString() };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return NextResponse.json(files);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
