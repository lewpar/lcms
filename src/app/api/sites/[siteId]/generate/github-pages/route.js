import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { readSites, ROOT, OUTPUT_DIR, DOCS_DIR } from '../../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../../lib/validate.js';

function generate(siteId, slug) {
  return execFileSync('node', ['generator/index.js', siteId, slug], {
    cwd: ROOT, encoding: 'utf-8', timeout: 30000,
  });
}

function deployToDir(slug, destRoot) {
  const srcDir = path.join(OUTPUT_DIR, slug);
  const destDir = path.join(destRoot, slug);
  fs.mkdirSync(destDir, { recursive: true });
  execFileSync('cp', ['-rT', srcDir, destDir], { timeout: 30000 });
}

export async function POST(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  const site = readSites().find(s => s.id === siteId);
  if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  let body = {};
  try { body = await request.json(); } catch {}

  try {
    const out = generate(site.id, site.slug);
    deployToDir(site.slug, DOCS_DIR);

    const commitMessage = (typeof body.commitMessage === 'string' && body.commitMessage.trim())
      ? body.commitMessage.trim()
      : `Deploy ${site.slug} to GitHub Pages`;

    try {
      execFileSync('git', ['add', 'docs/'], { cwd: ROOT, timeout: 15000 });
    } catch (addErr) {
      const msg = addErr.stderr ? addErr.stderr.toString().trim() : String(addErr.message || addErr);
      return NextResponse.json({ error: `Git staging failed: ${msg}` }, { status: 500 });
    }

    let gitWarning = null;
    try {
      execFileSync('git', ['commit', '-m', commitMessage], { cwd: ROOT, timeout: 15000 });
    } catch (commitErr) {
      const output = [
        commitErr.stderr ? commitErr.stderr.toString() : '',
        commitErr.stdout ? commitErr.stdout.toString() : '',
      ].join(' ');
      if (!output.includes('nothing to commit')) {
        gitWarning = output.trim() || String(commitErr.message || commitErr);
      }
    }

    try {
      execFileSync('git', ['push'], { cwd: ROOT, timeout: 30000 });
    } catch (pushErr) {
      const msg = pushErr.stderr ? pushErr.stderr.toString().trim() : String(pushErr.message || pushErr);
      return NextResponse.json({ error: `Git push failed: ${msg}` }, { status: 500 });
    }

    const message = out.trim() || 'Site deployed to GitHub Pages';
    return NextResponse.json({ success: true, message, siteSlug: site.slug, ...(gitWarning ? { gitWarning } : {}) });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
