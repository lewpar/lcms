'use strict';

const fs     = require('fs');
const router = require('express').Router({ mergeParams: true });
const { settingsFile, ensureDirs } = require('../lib/paths');
const { requireValidSiteId, requireSiteExists, sanitiseSettings, safeError } = require('../lib/validate');

const DEFAULT_SETTINGS = { title: 'My Site', navPages: [], sections: [], theme: {} };

router.use(requireValidSiteId, requireSiteExists);

router.get('/', (req, res) => {
  const fp = settingsFile(req.params.siteId);
  if (!fs.existsSync(fp)) return res.json(DEFAULT_SETTINGS);
  try { res.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); }
  catch { res.json(DEFAULT_SETTINGS); }
});

router.put('/', (req, res) => {
  ensureDirs(req.params.siteId);
  const body = sanitiseSettings(req.body);
  try {
    fs.writeFileSync(settingsFile(req.params.siteId), JSON.stringify(body, null, 2));
    res.json(body);
  } catch (err) { res.status(500).json({ error: safeError(err) }); }
});

module.exports = router;
