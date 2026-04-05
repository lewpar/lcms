import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { readSites, writeSites, settingsFile, ensureDirs, slugify, isReservedSlug, DOCS_DIR } from '../../../../server/lib/paths.js';
import { safeError, MAX_STR } from '../../../../server/lib/validate.js';

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

function validateSlug(slug) {
  if (!slug) return 'Slug is required.';
  if (!SLUG_RE.test(slug)) return 'Slug may only contain lowercase letters, numbers, and hyphens.';
  if (isReservedSlug(slug)) return `"${slug}" is a reserved slug.`;
  return null;
}

export async function GET() {
  const sites = readSites().map(s => ({
    ...s,
    deployedGithubPages: fs.existsSync(path.join(DOCS_DIR, s.slug, 'index.html')),
  }));
  return NextResponse.json(sites);
}

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch {}
  const name = (body.name || '').trim().slice(0, MAX_STR.name);
  if (!name) return NextResponse.json({ error: 'Site name is required.' }, { status: 400 });
  const rawSlug = body.slug ? String(body.slug).trim().slice(0, MAX_STR.slug) : slugify(name);
  const slugError = validateSlug(rawSlug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });
  const sites = readSites();
  if (sites.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: `A site named "${name}" already exists.` }, { status: 409 });
  }
  if (sites.some(s => s.slug === rawSlug)) {
    return NextResponse.json({ error: `A site with slug "${rawSlug}" already exists.` }, { status: 409 });
  }
  const id = uuidv4();
  ensureDirs(id);
  try {
    fs.writeFileSync(settingsFile(id), JSON.stringify({ title: name, navPages: [], sections: [], theme: {} }, null, 2));
    const site = { id, name, slug: rawSlug };
    writeSites([...sites, site]);
    return NextResponse.json(site);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
