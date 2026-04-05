import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readSites, writeSites, siteDir, settingsFile, OUTPUT_DIR, DOCS_DIR } from '../../../../lib/paths.js';
import { safeError, validateSlug, resolveSite, MAX_STR } from '../../../../lib/validate.js';

export async function PATCH(request, { params }) {
  const { siteId } = params;
  // Validate ID and existence before reading for modification
  const [, validationErr] = resolveSite(siteId);
  if (validationErr) return validationErr;

  const sites = readSites();
  const idx = sites.findIndex(s => s.id === siteId);

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
      } catch (err) {
        // Settings title update is non-critical but surface it so callers are aware
        console.error('Failed to update settings title on rename:', err.message);
        return NextResponse.json({ error: `Site renamed but settings title could not be updated: ${err.message}` }, { status: 207 });
      }
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
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}

export async function DELETE(request, { params }) {
  const { siteId } = params;
  const [site, err] = resolveSite(siteId);
  if (err) return err;

  try {
    const contentDir = siteDir(siteId);
    if (fs.existsSync(contentDir)) fs.rmSync(contentDir, { recursive: true });
    const outputDir = path.join(OUTPUT_DIR, site.slug);
    if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
    const docsDir = path.join(DOCS_DIR, site.slug);
    if (fs.existsSync(docsDir)) fs.rmSync(docsDir, { recursive: true });
    writeSites(readSites().filter(s => s.id !== siteId));
    return NextResponse.json({ success: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
