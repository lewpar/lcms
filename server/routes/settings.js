'use strict';

const fs     = require('fs');
const router = require('express').Router({ mergeParams: true });
const { settingsFile, ensureDirs } = require('../lib/paths');

const DEFAULT_SETTINGS = { title: 'My Site', navPages: [], sections: [], theme: {} };

router.get('/', (req, res) => {
  const fp = settingsFile(req.params.siteId);
  if (!fs.existsSync(fp)) return res.json(DEFAULT_SETTINGS);
  try { res.json(JSON.parse(fs.readFileSync(fp, 'utf-8'))); }
  catch { res.json(DEFAULT_SETTINGS); }
});

router.put('/', (req, res) => {
  ensureDirs(req.params.siteId);
  try {
    fs.writeFileSync(settingsFile(req.params.siteId), JSON.stringify(req.body, null, 2));
    res.json(req.body);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
