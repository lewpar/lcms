import { NextResponse } from 'next/server';
import { ROOT } from '../../../../../lib/paths.js';
import { safeError, resolveSite } from '../../../../../lib/validate.js';
import { generate } from '../../../../../generator/index.js';

export async function POST(request, { params }) {
  const [site, err] = resolveSite(params.siteId);
  if (err) return err;

  try {
    const out = generate(site.id, site.slug, ROOT);
    return NextResponse.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
