'use strict';

const { execFileSync } = require('child_process');
const router = require('express').Router();

function getNginxStatus() {
  try {
    const status = execFileSync('systemctl', ['is-active', 'nginx'], { encoding: 'utf-8', timeout: 5000 }).trim();
    return { status }; // 'active' | 'inactive' | 'failed' | etc.
  } catch (err) {
    // systemctl exits non-zero when nginx is not active — still a valid response
    const status = (err.stdout || '').trim() || 'unknown';
    return { status };
  }
}

router.get('/status', (req, res) => {
  res.json(getNginxStatus());
});

router.post('/reload', (req, res) => {
  try {
    execFileSync('systemctl', ['reload', 'nginx'], { timeout: 10000 });
    res.json({ success: true });
  } catch (err) {
    const msg = (err.stderr || err.message || '').toString().trim();
    res.status(500).json({ error: msg || 'Failed to reload nginx' });
  }
});

module.exports = router;
