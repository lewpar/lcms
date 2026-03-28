'use strict';

const fs     = require('fs');
const router = require('express').Router();
const { CMS_SETTINGS_FILE } = require('../lib/paths');
const { safeError } = require('../lib/validate');

const DEFAULTS = { baseUrl: '' };

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CMS_SETTINGS_FILE, 'utf-8')) }; }
  catch { return { ...DEFAULTS }; }
}

router.get('/', (req, res) => {
  res.json(read());
});

router.put('/', (req, res) => {
  try {
    const existing = read();
    const baseUrl = typeof req.body.baseUrl === 'string'
      ? req.body.baseUrl.trim().replace(/\/+$/, '').slice(0, 500)
      : existing.baseUrl;
    const updated = { ...existing, baseUrl };
    fs.writeFileSync(CMS_SETTINGS_FILE, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
