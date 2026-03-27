'use strict';

const fs     = require('fs');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const router = require('express').Router({ mergeParams: true });
const { assetsDir, ensureDirs } = require('../lib/paths');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']);

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

// Validate file magic bytes after the file has been saved to disk.
// Returns true if the file content matches the declared extension.
function validateMagicBytes(filePath, ext) {
  const HEADER_SIZE = 12;
  let buf;
  try {
    const fd = fs.openSync(filePath, 'r');
    buf = Buffer.alloc(HEADER_SIZE);
    fs.readSync(fd, buf, 0, HEADER_SIZE, 0);
    fs.closeSync(fd);
  } catch {
    return false;
  }

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;

    case '.png':
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47
          && buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;

    case '.gif':
      // GIF87a or GIF89a
      return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
          && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61;

    case '.webp':
      // RIFF????WEBP
      return buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
          && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;

    case '.avif':
      // ISO Base Media File Format: bytes 4-7 are 'ftyp'
      return buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70;

    case '.svg': {
      // SVG is XML text — check for expected opening tags
      const text = buf.toString('utf8').trimStart();
      return text.startsWith('<svg') || text.startsWith('<?xml') || text.startsWith('<!DOCTYPE');
    }

    default:
      return false;
  }
}

router.get('/', (req, res) => {
  const dir = assetsDir(req.params.siteId);
  if (!fs.existsSync(dir)) return res.json([]);
  try {
    const files = fs.readdirSync(dir)
      .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .map(f => {
        const fp   = path.join(dir, f);
        const stat = fs.statSync(fp);
        return { filename: f, url: `/assets/${req.params.siteId}/${f}`, size: stat.size, createdAt: stat.birthtime.toISOString() };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(files);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:filename', (req, res) => {
  const fp = path.join(assetsDir(req.params.siteId), req.params.filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  try { fs.unlinkSync(fp); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/upload', (req, res) => {
  ensureDirs(req.params.siteId);

  const storage = multer.diskStorage({
    destination: assetsDir(req.params.siteId),
    filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) return cb(new Error(`File extension "${ext}" is not allowed.`));
      if (!file.mimetype.startsWith('image/')) return cb(new Error(`MIME type "${file.mimetype}" is not allowed.`));
      cb(null, true);
    },
  });

  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File exceeds the ${MAX_FILE_SIZE / 1024 / 1024} MB size limit.` });
    }
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });

    const ext      = path.extname(req.file.filename).toLowerCase();
    const filePath = req.file.path;

    if (!validateMagicBytes(filePath, ext)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'File content does not match its extension. Upload rejected.' });
    }

    res.json({ url: `/assets/${req.params.siteId}/${req.file.filename}` });
  });
});

module.exports = router;
