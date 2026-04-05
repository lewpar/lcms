import { spawnSync } from 'child_process';
import { readSites, ROOT } from '../../../../../../lib/paths.js';
import { isValidId } from '../../../../../../lib/validate.js';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  if (!readSites().find(s => s.id === siteId)) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  let body = {};
  try { body = await request.json(); } catch {}
  const { page } = body;
  if (!page) return NextResponse.json({ error: 'page is required' }, { status: 400 });

  const result = spawnSync('node', ['generator/index.js', '--preview', siteId], {
    input: JSON.stringify({ page }),
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });

  if (result.error || result.status !== 0) {
    return NextResponse.json({ error: result.stderr || 'Preview generation failed' }, { status: 500 });
  }

  return new Response(result.stdout, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
