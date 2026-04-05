import { NextResponse } from 'next/server';
import fs from 'fs';
import { settingsFile, ensureDirs } from '../../../../../lib/paths.js';
import { sanitiseSettings, safeError, resolveSite } from '../../../../../lib/validate.js';

const DEFAULT_SETTINGS = { title: 'My Site', navPages: [], sections: [], theme: {} };

export async function GET(request, { params }) {
  const [, err] = resolveSite(params.siteId);
  if (err) return err;
  const { siteId } = params;

  const fp = settingsFile(siteId);
  if (!fs.existsSync(fp)) return NextResponse.json(DEFAULT_SETTINGS);
  try { return NextResponse.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); }
  catch { return NextResponse.json(DEFAULT_SETTINGS); }
}

export async function PUT(request, { params }) {
  const [, err] = resolveSite(params.siteId);
  if (err) return err;
  const { siteId } = params;

  ensureDirs(siteId);
  let rawBody = {};
  try { rawBody = await request.json(); } catch {}
  const body = sanitiseSettings(rawBody);
  try {
    fs.writeFileSync(settingsFile(siteId), JSON.stringify(body, null, 2));
    return NextResponse.json(body);
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
