import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { writeSites, readSites, DOCS_DIR, ROOT } from '../../../../../../lib/paths.js';
import { safeError, resolveSite } from '../../../../../../lib/validate.js';

export async function DELETE(request, { params }) {
  const [site, err] = resolveSite(params.siteId);
  if (err) return err;
  const { siteId } = params;

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
    writeSites(readSites().map(s => s.id === siteId ? { ...s, deployedGithubPages: false } : s));

    return NextResponse.json({ success: true, ...(gitWarning ? { gitWarning } : {}) });
  } catch (err) { console.error(err); return NextResponse.json({ error: safeError(err) }, { status: 500 }); }
}
