'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const router = require('express').Router({ mergeParams: true });

const { readSites, ROOT, OUTPUT_DIR, DOCS_DIR } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, safeError } = require('../lib/validate');

function generate(siteId, slug) {
  return execFileSync('node', ['generator/index.js', siteId, slug], {
    cwd: ROOT, encoding: 'utf-8', timeout: 30000,
  });
}

// Copy the generated output directory into a deployment destination.
// Uses `cp -rT` (GNU coreutils) to merge the source tree into the dest dir.
function deployToDir(slug, destRoot) {
  const srcDir  = path.join(OUTPUT_DIR, slug);
  const destDir = path.join(destRoot, slug);
  fs.mkdirSync(destDir, { recursive: true });
  execFileSync('cp', ['-rT', srcDir, destDir], { timeout: 30000 });
}

// Render a minimal page preview (blocks only, no nav/header/footer).
// Accepts { page: { title, blocks } } in the request body.
// Returns standalone HTML with the site's theme CSS and inlined JS.
router.post('/preview-page', requireValidSiteId, requireSiteExists, (req, res) => {
  const { page } = req.body;
  if (!page) return res.status(400).json({ error: 'page is required' });
  const result = spawnSync('node', ['generator/index.js', '--preview', req.params.siteId], {
    input: JSON.stringify({ page }),
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
  if (result.error || result.status !== 0) {
    return res.status(500).json({ error: result.stderr || 'Preview generation failed' });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(result.stdout);
});

// Generate only — outputs to output/<slug>/ for the live preview.
// Does not require nginx or any external web server.
router.post('/', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const out = generate(site.id, site.slug);
    res.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

// Deploy to GitHub Pages (docs/<slug>/) then git add/commit/push the docs folder.
router.post('/github-pages', requireValidSiteId, requireSiteExists, (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  try {
    const out = generate(site.id, site.slug);
    deployToDir(site.slug, DOCS_DIR);

    // Stage only the docs folder, commit, and push
    const commitMessage = (req.body && typeof req.body.commitMessage === 'string' && req.body.commitMessage.trim())
      ? req.body.commitMessage.trim()
      : `Deploy ${site.slug} to GitHub Pages`;

    // git add — fatal if it fails
    try {
      execFileSync('git', ['add', 'docs/'], { cwd: ROOT, timeout: 15000 });
    } catch (addErr) {
      const msg = addErr.stderr ? addErr.stderr.toString().trim() : String(addErr.message || addErr);
      return res.status(500).json({ error: `Git staging failed: ${msg}` });
    }

    // git commit — non-fatal; "nothing to commit" is a normal outcome
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

    // git push — fatal; if this fails the site has not been deployed to GitHub
    try {
      execFileSync('git', ['push'], { cwd: ROOT, timeout: 30000 });
    } catch (pushErr) {
      const msg = pushErr.stderr ? pushErr.stderr.toString().trim() : String(pushErr.message || pushErr);
      return res.status(500).json({ error: `Git push failed: ${msg}` });
    }

    const message = out.trim() || 'Site deployed to GitHub Pages';
    res.json({ success: true, message, siteSlug: site.slug, ...(gitWarning ? { gitWarning } : {}) });
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
