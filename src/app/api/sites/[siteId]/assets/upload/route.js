import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { assetsDir, ensureDirs, readSites } from '../../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../../lib/validate.js';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

function validateMagicBytes(buffer, ext) {
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    case '.png':
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
          && buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
    case '.gif':
      return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38
          && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61;
    case '.webp':
      return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
          && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    case '.avif':
      return buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
    default:
      return false;
  }
}

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  ensureDirs(siteId);

  let formData;
  try { formData = await request.formData(); }
  catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 400 }); }

  const file = formData.get('file');
  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `File extension "${ext}" is not allowed.` }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: `MIME type "${file.type}" is not allowed.` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File exceeds the ${MAX_FILE_SIZE / 1024 / 1024} MB size limit.` }, { status: 400 });
  }

  if (!validateMagicBytes(buffer, ext)) {
    return NextResponse.json({ error: 'File content does not match its extension. Upload rejected.' }, { status: 400 });
  }

  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(assetsDir(siteId), filename);
  try {
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ url: `/assets/${siteId}/${filename}` });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
