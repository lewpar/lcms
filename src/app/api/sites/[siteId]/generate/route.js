import { NextResponse } from 'next/server';
import { readSites, ROOT } from '../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../lib/validate.js';
import { generate } from '../../../../../generator/index.js';

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  const site = readSites().find(s => s.id === siteId);
  if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  try {
    const out = generate(site.id, site.slug, ROOT);
    return NextResponse.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
