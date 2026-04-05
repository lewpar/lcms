import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readSites, writeSites, siteDir, settingsFile, OUTPUT_DIR, DOCS_DIR } from '../../../../../server/lib/paths.js';
import { isValidId, safeError, MAX_STR } from '../../../../../server/lib/validate.js';

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const RESERVED_SLUGS = new Set([
  'assets', 'api', 'admin', 'static', 'public', 'media', 'upload', 'uploads',
  'files', 'images', 'img', 'js', 'css', 'fonts', 'favicon', 'robots',
  'sitemap', 'feed', 'rss', 'atom', 'auth', 'login', 'logout', 'signup',
  'register', 'dashboard', 'settings', 'profile', 'account',
]);

function validateSlug(slug) {
  if (!slug) return 'Slug is required.';
  if (!SLUG_RE.test(slug)) return 'Slug may only contain lowercase letters, numbers, and hyphens.';
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is a reserved slug.`;
  return null;
}

export async function PATCH(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });

  const sites = readSites();
  const idx = sites.findIndex(s => s.id === siteId);
  if (idx === -1) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  let body = {};
  try { body = await request.json(); } catch {}

  if (body.name !== undefined) {
    const newName = String(body.name).trim().slice(0, MAX_STR.name);
    if (!newName) return NextResponse.json({ error: 'Site name is required.' }, { status: 400 });
    const duplicate = sites.find(s => s.id !== siteId && s.name.toLowerCase() === newName.toLowerCase());
    if (duplicate) return NextResponse.json({ error: `A site named "${newName}" already exists.` }, { status: 409 });
    sites[idx].name = newName;
    const fp = settingsFile(siteId);
    if (fs.existsSync(fp)) {
      try {
        const s = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        fs.writeFileSync(fp, JSON.stringify({ ...s, title: newName }, null, 2));
      } catch (err) { console.error('Failed to update settings title on rename:', err.message); }
    }
  }

  if (body.slug !== undefined) {
    const newSlug = String(body.slug).trim().slice(0, MAX_STR.slug);
    const slugError = validateSlug(newSlug);
    if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });
    const slugDuplicate = sites.find(s => s.id !== siteId && s.slug === newSlug);
    if (slugDuplicate) return NextResponse.json({ error: `A site with slug "${newSlug}" already exists.` }, { status: 409 });
    const oldSlug = sites[idx].slug;
    sites[idx].slug = newSlug;
    if (oldSlug !== newSlug) {
      const oldOutput = path.join(OUTPUT_DIR, oldSlug);
      if (fs.existsSync(oldOutput)) fs.renameSync(oldOutput, path.join(OUTPUT_DIR, newSlug));
      const oldDocs = path.join(DOCS_DIR, oldSlug);
      if (fs.existsSync(oldDocs)) fs.renameSync(oldDocs, path.join(DOCS_DIR, newSlug));
    }
  }

  try {
    writeSites(sites);
    return NextResponse.json(sites[idx]);
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });

  const sites = readSites();
  const site = sites.find(s => s.id === siteId);
  if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  try {
    const contentDir = siteDir(siteId);
    if (fs.existsSync(contentDir)) fs.rmSync(contentDir, { recursive: true });
    const outputDir = path.join(OUTPUT_DIR, site.slug);
    if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
    writeSites(sites.filter(s => s.id !== siteId));
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
