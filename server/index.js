'use strict';

const express = require('express');
const cors    = require('cors');
const { assetsDir, OUTPUT_DIR } = require('./lib/paths');

const app  = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static: exported site previews and per-site uploaded assets
app.use('/site-preview', express.static(OUTPUT_DIR));
app.use('/assets/:siteId', (req, res, next) => {
  express.static(assetsDir(req.params.siteId))(req, res, next);
});

// API routes
app.use('/api/sites',                          require('./routes/sites'));
app.use('/api/sites/:siteId/pages',            require('./routes/pages'));
app.use('/api/sites/:siteId/settings',         require('./routes/settings'));
app.use('/api/sites/:siteId/assets',           require('./routes/assets'));
app.use('/api/sites/:siteId/generate',         require('./routes/generate'));

// Production: serve the built React client and fall back to index.html for SPA routing
if (process.env.SERVE_CLIENT === '1') {
  const path = require('path');
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => console.log(`LCMS server running on http://localhost:${PORT}`));
