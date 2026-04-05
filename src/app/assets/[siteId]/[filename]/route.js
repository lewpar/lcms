import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { assetsDir } from '../../../../lib/paths.js';
import { isValidId, isSafeFilename, assertWithinDir } from '../../../../lib/validate.js';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

const IMAGE_EXTENSIONS = new Set(Object.keys(MIME_TYPES));

export async function GET(request, { params }) {
  const { siteId, filename } = params;

  if (!isValidId(siteId)) {
    return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  }

  if (!isSafeFilename(filename)) {
    return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
  }

  const dir = assetsDir(siteId);
  const filePath = path.join(dir, filename);

  if (!assertWithinDir(filePath, dir)) {
    return NextResponse.json({ error: 'Invalid filename.' }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'File type not allowed.' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  return new Response(data, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
