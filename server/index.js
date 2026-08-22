require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const classRoutes = require('./routes/class.routes');
const subjectRoutes = require('./routes/subject.routes');
const examRoutes = require('./routes/exam.routes');
const markRoutes = require('./routes/mark.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const documentRoutes = require('./routes/document.routes');
const notificationRoutes = require('./routes/notification.routes');
const feeRoutes = require('./routes/fee.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingRoutes = require('./routes/setting.routes');
const auditRoutes = require('./routes/audit.routes');
const backupRoutes = require('./routes/backup.routes');
const printRoutes = require('./routes/print.routes');
const searchRoutes = require('./routes/search.routes');
const transportRoutes = require('./routes/transport.routes');
const demoRoutes = require('./routes/demo.routes');

const app = express();
const PORT = process.env.PORT || 5000;

const envCheck = require('./utils/env').validateEnv();
if (!envCheck.valid && process.env.NODE_ENV === 'production') {
  console.error('[env] Fatal: missing required environment variables in production.');
  process.exit(1);
}

const prisma = require('./config/db');
const logger = require('./utils/logger');
const appVersion = require('./package.json').version;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
// Demo + production: support comma-separated FRONTEND_URL list (e.g. "https://a.vercel.app,https://b.onrender.com")
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl/health checks
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    // In demo mode, allow any vercel/render preview for convenience
    if (process.env.DEMO_MODE === 'true' && /https:\/\/.+\.(vercel\.app|onrender\.com|netlify\.app)$/.test(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/print', printRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/demo', demoRoutes);

app.get('/api/health', async (req, res) => {
  let dbStatus = 'down';
  let dbError = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'up';
  } catch (error) {
    dbError = error.message;
  }
  res.json({
    status: 'ok',
    version: appVersion,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    demoMode: process.env.DEMO_MODE === 'true',
    database: { status: dbStatus, error: dbError },
  });
});

// Demo / single-service: serve built frontend if client/dist exists (Render single-service mode)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for non-API routes
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use('/api', (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

const httpServer = http.createServer(app);

let httpsServer = null;
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;
const httpsPort = process.env.HTTPS_PORT || 5443;

if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const sslOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
  httpsServer = https.createServer(sslOptions, app);
  httpsServer.listen(httpsPort, () => {
    console.log(`HTTPS server running on port ${httpsPort}`);
  });
}

httpServer.listen(PORT, () => {
  console.log(`[server] v${appVersion} HTTP server running on port ${PORT}`);
});

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(() => {
    console.log('HTTP server closed.');
    if (httpsServer) {
      httpsServer.close(() => {
        console.log('HTTPS server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  setTimeout(() => {
    console.error('Forced shutdown after 10s.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server: httpServer, httpsServer };
