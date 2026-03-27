const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { execSync } = require('child_process');

const app = express();
const PORT = 3001;
const ROOT        = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const SITES_DIR   = path.join(CONTENT_DIR, 'sites');
const SITES_INDEX = path.join(CONTENT_DIR, 'sites.json');
const OUTPUT_DIR  = path.join(ROOT, 'output');

for (const dir of [CONTENT_DIR, SITES_DIR, OUTPUT_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Migration: single-site → multi-site ────────────────
(function migrate() {
  if (fs.existsSync(SITES_INDEX)) return;
  const legacySettings = path.join(CONTENT_DIR, 'site.json');
  const legacyPages    = path.join(CONTENT_DIR, 'pages');
  const legacyAssets   = path.join(CONTENT_DIR, 'assets');
  const sites = [];
  if (fs.existsSync(legacySettings)) {
    let settings = { title: 'My Site' };
    try { settings = JSON.parse(fs.readFileSync(legacySettings, 'utf-8')); } catch {}
    const id   = uuidv4();
    const name = settings.title || 'My Site';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'my-site';
    const dir  = path.join(SITES_DIR, id);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(legacySettings, path.join(dir, 'site.json'));
    if (fs.existsSync(legacyPages))  fs.cpSync(legacyPages,  path.join(dir, 'pages'),  { recursive: true });
    if (fs.existsSync(legacyAssets)) fs.cpSync(legacyAssets, path.join(dir, 'assets'), { recursive: true });
    sites.push({ id, name, slug });
    console.log(`Migrated legacy site "${name}" → sites/${id}`);
  }
  fs.writeFileSync(SITES_INDEX, JSON.stringify(sites, null, 2));
})();

// ── Helpers ─────────────────────────────────────────────
function readSites()        { try { return JSON.parse(fs.readFileSync(SITES_INDEX, 'utf-8')); } catch { return []; } }
function writeSites(sites)  { fs.writeFileSync(SITES_INDEX, JSON.stringify(sites, null, 2)); }
function siteDir(id)        { return path.join(SITES_DIR, id); }
function pagesDir(id)       { return path.join(siteDir(id), 'pages'); }
function assetsDir(id)      { return path.join(siteDir(id), 'assets'); }
function settingsFile(id)   { return path.join(siteDir(id), 'site.json'); }
function ensureDirs(id) {
  for (const d of [siteDir(id), pagesDir(id), assetsDir(id)]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site';
}

const RESERVED_SLUGS = new Set([
  'assets', 'api', 'admin', 'static', 'public', 'media', 'upload', 'uploads',
  'files', 'images', 'img', 'js', 'css', 'fonts', 'favicon', 'robots',
  'sitemap', 'feed', 'rss', 'atom', 'auth', 'login', 'logout', 'signup',
  'register', 'dashboard', 'settings', 'profile', 'account',
]);

function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/site-preview', express.static(OUTPUT_DIR));

// Per-site asset serving: /assets/:siteId/:filename
app.get('/assets/:siteId/:filename', (req, res) => {
  const fp = path.join(assetsDir(req.params.siteId), req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).send('Not found');
  res.sendFile(fp);
});

// ── Sites API ───────────────────────────────────────────

app.get('/api/sites', (req, res) => res.json(readSites()));

app.post('/api/sites', (req, res) => {
  const name = (req.body.name || 'New Site').trim();
  const id   = uuidv4();
  const slug = slugify(name);
  ensureDirs(id);
  fs.writeFileSync(settingsFile(id), JSON.stringify({ title: name, navPages: [], sections: [], theme: {} }, null, 2));
  const site = { id, name, slug };
  writeSites([...readSites(), site]);
  res.json(site);
});

app.patch('/api/sites/:siteId', (req, res) => {
  const sites = readSites();
  const idx   = sites.findIndex(s => s.id === req.params.siteId);
  if (idx === -1) return res.status(404).json({ error: 'Site not found' });
  if (req.body.name) {
    sites[idx].name = req.body.name.trim();
    sites[idx].slug = slugify(sites[idx].name);
    // keep settings title in sync
    const fp = settingsFile(req.params.siteId);
    if (fs.existsSync(fp)) {
      try {
        const s = JSON.parse(fs.readFileSync(fp, 'utf-8'));
        fs.writeFileSync(fp, JSON.stringify({ ...s, title: sites[idx].name }, null, 2));
      } catch {}
    }
  }
  writeSites(sites);
  res.json(sites[idx]);
});

app.delete('/api/sites/:siteId', (req, res) => {
  const sites = readSites();
  const site  = sites.find(s => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const dir = siteDir(req.params.siteId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  writeSites(sites.filter(s => s.id !== req.params.siteId));
  res.json({ success: true });
});

// ── Pages API ───────────────────────────────────────────

app.get('/api/sites/:siteId/pages', (req, res) => {
  const dir = pagesDir(req.params.siteId);
  if (!fs.existsSync(dir)) return res.json([]);
  try {
    const pages = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
      .map(f => { try { const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); return { id: d.id, title: d.title, slug: d.slug, section: d.section || '', updatedAt: d.updatedAt }; } catch { return null; } })
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(pages);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sites/:siteId/pages/:id', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  try { res.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sites/:siteId/pages', (req, res) => {
  ensureDirs(req.params.siteId);
  const id  = uuidv4();
  const now = new Date().toISOString();
  const slug = req.body.slug || id;
  if (isReservedSlug(slug)) return res.status(400).json({ error: `"${slug}" is a reserved slug and cannot be used.` });
  const page = { id, title: req.body.title || 'Untitled', slug, description: '', blocks: [], createdAt: now, updatedAt: now };
  try {
    fs.writeFileSync(path.join(pagesDir(req.params.siteId), `${id}.json`), JSON.stringify(page, null, 2));
    res.json(page);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/sites/:siteId/pages/:id', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  if (req.body.slug && isReservedSlug(req.body.slug)) return res.status(400).json({ error: `"${req.body.slug}" is a reserved slug and cannot be used.` });
  try {
    const existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const updated  = { ...existing, ...req.body, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    fs.writeFileSync(fp, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sites/:siteId/pages/:id/duplicate', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  try {
    const existing = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const id  = uuidv4();
    const now = new Date().toISOString();
    const copy = { ...existing, id, title: existing.title + ' (copy)', slug: existing.slug + '-copy', createdAt: now, updatedAt: now };
    fs.writeFileSync(path.join(pagesDir(req.params.siteId), `${id}.json`), JSON.stringify(copy, null, 2));
    res.json(copy);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/sites/:siteId/pages/:id', (req, res) => {
  const fp = path.join(pagesDir(req.params.siteId), `${req.params.id}.json`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(fp); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Settings API ────────────────────────────────────────

const DEFAULT_SETTINGS = { title: 'My Site', navPages: [], sections: [], theme: {} };

app.get('/api/sites/:siteId/settings', (req, res) => {
  const fp = settingsFile(req.params.siteId);
  if (!fs.existsSync(fp)) return res.json(DEFAULT_SETTINGS);
  try { res.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); } catch { res.json(DEFAULT_SETTINGS); }
});

app.put('/api/sites/:siteId/settings', (req, res) => {
  ensureDirs(req.params.siteId);
  try {
    fs.writeFileSync(settingsFile(req.params.siteId), JSON.stringify(req.body, null, 2));
    res.json(req.body);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Asset upload ────────────────────────────────────────

app.post('/api/sites/:siteId/upload', (req, res) => {
  ensureDirs(req.params.siteId);
  const storage = multer.diskStorage({
    destination: assetsDir(req.params.siteId),
    filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  });
  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Only image files allowed')),
  });
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    res.json({ url: `/assets/${req.params.siteId}/${req.file.filename}` });
  });
});

// ── Generate ────────────────────────────────────────────

app.post('/api/sites/:siteId/generate', (req, res) => {
  const site = readSites().find(s => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  try {
    const out = execSync(`node generator/index.js ${req.params.siteId} ${site.slug}`, {
      cwd: ROOT, encoding: 'utf-8', timeout: 30000,
    });
    res.json({ success: true, message: out.trim() || 'Site generated', siteSlug: site.slug });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`LCMS server running on http://localhost:${PORT}`));
