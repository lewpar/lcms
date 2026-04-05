import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import { readSites, ROOT } from '../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../lib/validate.js';

function generate(siteId, slug) {
  return execFileSync('node', ['generator/index.js', siteId, slug], {
    cwd: ROOT, encoding: 'utf-8', timeout: 30000,
  });
}

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  const site = readSites().find(s => s.id === siteId);
  if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  try {
    const out = generate(site.id, site.slug);
    return NextResponse.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
