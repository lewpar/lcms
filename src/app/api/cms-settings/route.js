import { NextResponse } from 'next/server';
import fs from 'fs';
import { CMS_SETTINGS_FILE } from '../../../../server/lib/paths.js';
import { safeError } from '../../../../server/lib/validate.js';

const DEFAULTS = { baseUrl: '', themes: [] };

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CMS_SETTINGS_FILE, 'utf-8')) }; }
  catch { return { ...DEFAULTS }; }
}

function write(data) {
  fs.writeFileSync(CMS_SETTINGS_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(read());
}

export async function PUT(request) {
  try {
    const existing = read();
    let body = {};
    try { body = await request.json(); } catch {}
    const baseUrl = typeof body.baseUrl === 'string'
      ? body.baseUrl.trim().replace(/\/+$/, '').slice(0, 500)
      : existing.baseUrl;
    const updated = { ...existing, baseUrl };
    write(updated);
    return NextResponse.json(updated);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
