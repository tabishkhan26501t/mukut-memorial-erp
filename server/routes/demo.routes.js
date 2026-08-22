const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const path = require('path');

function requireDemoResetAuth(req, res, next) {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(403).json({ message: 'Demo reset is only available when DEMO_MODE=true.' });
  }
  const token = req.headers['x-demo-reset-token'] || req.query.token || req.body?.token;
  const expected = process.env.DEMO_RESET_TOKEN;
  if (!expected) {
    return res.status(503).json({ message: 'DEMO_RESET_TOKEN not configured on server.' });
  }
  if (token !== expected) {
    return res.status(401).json({ message: 'Invalid demo reset token.' });
  }
  next();
}

// POST /api/demo/reset  — reseeds the demo DB (fictional data only, never touches production)
router.post('/reset', requireDemoResetAuth, async (req, res) => {
  const seedPath = path.join(__dirname, '..', 'prisma', 'seed-demo.js');
  execFile('node', [seedPath], { env: { ...process.env, DEMO_MODE: 'true' }, timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error('[demo-reset] seed failed:', error, stderr);
      return res.status(500).json({ message: 'Demo reset failed.', error: stderr || error.message });
    }
    console.log('[demo-reset] completed:', stdout.slice(0, 2000));
    return res.json({ message: 'Demo database has been reset to fictional seed data.', log: stdout.slice(0, 3000) });
  });
});

router.get('/status', (req, res) => {
  res.json({ demoMode: process.env.DEMO_MODE === 'true', hasResetToken: !!process.env.DEMO_RESET_TOKEN, timestamp: new Date().toISOString() });
});

module.exports = router;
