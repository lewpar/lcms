const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { execSync } = require('child_process');

const app = express();
const PORT = 3001;

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const PAGES_DIR = path.join(CONTENT_DIR, 'pages');
const ASSETS_DIR = path.join(CONTENT_DIR, 'assets');

// Ensure directories exist on startup
for (const dir of [CONTENT_DIR, PAGES_DIR, ASSETS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/site-preview', express.static(path.join(ROOT, 'output')));

// Multer for image uploads
const storage = multer.diskStorage({
  destination: ASSETS_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// ── Pages API ──────────────────────────────────────────

// List pages (summary only)
app.get('/api/pages', (req, res) => {
  try {
    const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.json'));
    const pages = files
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, f), 'utf-8'));
          return { id: data.id, title: data.title, slug: data.slug, section: data.section || '', updatedAt: data.updatedAt };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single page
app.get('/api/pages/:id', (req, res) => {
  const filePath = path.join(PAGES_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create page
app.post('/api/pages', (req, res) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const page = {
    id,
    title: req.body.title || 'Untitled',
    slug: req.body.slug || id,
    description: req.body.description || '',
    blocks: [],
    createdAt: now,
    updatedAt: now,
  };
  try {
    fs.writeFileSync(path.join(PAGES_DIR, `${id}.json`), JSON.stringify(page, null, 2));
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update page
app.put('/api/pages/:id', (req, res) => {
  const filePath = path.join(PAGES_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Duplicate page
app.post('/api/pages/:id/duplicate', (req, res) => {
  const filePath = path.join(PAGES_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const id = uuidv4();
    const now = new Date().toISOString();
    const copy = {
      ...existing,
      id,
      title: existing.title + ' (copy)',
      slug: existing.slug + '-copy',
      createdAt: now,
      updatedAt: now,
    };
    fs.writeFileSync(path.join(PAGES_DIR, `${id}.json`), JSON.stringify(copy, null, 2));
    res.json(copy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete page
app.delete('/api/pages/:id', (req, res) => {
  const filePath = path.join(PAGES_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Site settings ──────────────────────────────────────

const SETTINGS_FILE = path.join(CONTENT_DIR, 'site.json');

const DEFAULT_SETTINGS = { title: 'My Site', navPages: [] };

app.get('/api/settings', (req, res) => {
  if (!fs.existsSync(SETTINGS_FILE)) return res.json(DEFAULT_SETTINGS);
  try {
    res.json(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')));
  } catch {
    res.json(DEFAULT_SETTINGS);
  }
});

app.put('/api/settings', (req, res) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2));
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Asset upload ───────────────────────────────────────

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  res.json({ url: `/assets/${req.file.filename}` });
});

// ── Static site generation ─────────────────────────────

app.post('/api/generate', (req, res) => {
  try {
    const output = execSync('node generator/index.js', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30000,
    });
    res.json({ success: true, message: output.trim() || 'Site generated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`LCMS server running on http://localhost:${PORT}`);
});
