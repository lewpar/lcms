import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { readSites, writeSites, DOCS_DIR, ROOT } from '../../../../../../lib/paths.js';
import { isValidId, safeError } from '../../../../../../lib/validate.js';

export async function DELETE(request, { params }) {
  const { siteId } = params;
  if (!isValidId(siteId)) return NextResponse.json({ error: 'Invalid site ID.' }, { status: 400 });
  const sites = readSites();
  const site = sites.find(s => s.id === siteId);
  if (!site) return NextResponse.json({ error: 'Site not found.' }, { status: 404 });

  try {
    const deployDir = path.join(DOCS_DIR, site.slug);
    if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });

    // Stage the removal of docs/<slug>/
    try {
      execFileSync('git', ['add', 'docs/'], { cwd: ROOT, timeout: 15000 });
    } catch (addErr) {
      const msg = addErr.stderr ? addErr.stderr.toString().trim() : String(addErr.message || addErr);
      return NextResponse.json({ error: `Git staging failed: ${msg}` }, { status: 500 });
    }

    // Commit — tolerate "nothing to commit" (site was never pushed)
    let gitWarning = null;
    try {
      execFileSync('git', ['commit', '-m', `Undeploy ${site.slug} from GitHub Pages`], { cwd: ROOT, timeout: 15000 });
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

    // Mark site as no longer deployed
    writeSites(sites.map(s => s.id === siteId ? { ...s, deployedGithubPages: false } : s));

    return NextResponse.json({ success: true, ...(gitWarning ? { gitWarning } : {}) });
  } catch (err) { return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
