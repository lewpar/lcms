import { NextResponse } from 'next/server';
import { read, write } from '../../../lib/cms-settings.js';
import { safeError } from '../../../lib/validate.js';

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
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
