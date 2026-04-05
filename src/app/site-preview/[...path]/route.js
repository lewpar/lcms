import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { OUTPUT_DIR } from '../../../../server/lib/paths.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

export async function GET(request, { params }) {
  const pathParts = params.path; // array of path segments e.g. ['my-site', 'index.html']

  if (!pathParts || pathParts.length === 0) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  // Prevent path traversal attacks
  const normalizedPath = path.normalize(pathParts.join('/'));
  if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
    return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
  }

  let filePath = path.join(OUTPUT_DIR, normalizedPath);

  // If requesting a directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  // Security: ensure file is within OUTPUT_DIR
  const rel = path.relative(OUTPUT_DIR, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return NextResponse.json({ error: 'Invalid path.' }, { status: 400 });
  }

  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  return new Response(data, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
    },
  });
}
