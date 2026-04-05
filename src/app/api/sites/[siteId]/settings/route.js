import { NextResponse } from 'next/server';
import fs from 'fs';
import { settingsFile, ensureDirs, readSites } from '../../../../../lib/paths.js';
import { isValidId, sanitiseSettings, safeError } from '../../../../../lib/validate.js';

const DEFAULT_SETTINGS = { title: 'My Site', navPages: [], sections: [], theme: {} };

export async function GET(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  const fp = settingsFile(siteId);
  if (!fs.existsSync(fp)) return NextResponse.json(DEFAULT_SETTINGS);
  try { return NextResponse.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); }
  catch { return NextResponse.json(DEFAULT_SETTINGS); }
}

export async function PUT(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  ensureDirs(siteId);
  let rawBody = {};
  try { rawBody = await request.json(); } catch {}
  const body = sanitiseSettings(rawBody);
  try {
    fs.writeFileSync(settingsFile(siteId), JSON.stringify(body, null, 2));
    return NextResponse.json(body);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
