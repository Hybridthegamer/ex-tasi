require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const compression  = require('compression');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const connectDB    = require('./config/db');

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

const app    = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173'
].filter(Boolean);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  // Keep sockets alive under heavy load
  pingInterval: 25000,
  pingTimeout:  60000,
  // Limit connection flood
  connectTimeout: 10000,
  maxHttpBufferSize: 1e6   // 1 MB max message size
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

// Gzip all responses — significantly reduces bandwidth under concurrent load
app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────

// Strict limits on auth endpoints to block brute-force.
// Keyed by IP + email (not IP alone) so a whole classroom on one shared/NAT'd
// IP doesn't get locked out of logging in together — only repeated failed
// attempts against the *same* account count against the limit.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many attempts for this account. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req)}:${(req.body && req.body.email) || 'unknown'}`
});

// Generous limit for quiz/submission traffic (exam conditions)
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 800,
  message: { message: 'Too many requests. Please wait a moment before continuing.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't penalise answer-saves — they're frequent during an exam
  skip: (req) => req.method === 'PUT' && req.path.includes('/answer')
});

app.use('/api/auth', authLimiter);
app.use(['/api/quiz', '/api/submission', '/api/institution'], apiLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/quiz',        require('./routes/quiz'));
app.use('/api/submission',  require('./routes/submission'));
app.use('/api/institution', require('./routes/institution'));

// Health check — lightweight, no DB query, so it stays fast even under load
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Exétasi', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error.' });
});

// ── Socket.io proctoring ──────────────────────────────────────────────────────
require('./socket/proctor')(io);

// ── Server tuning ─────────────────────────────────────────────────────────────
// These prevent the process from hanging on slow clients and help free sockets
// more quickly under heavy concurrent load.
server.keepAliveTimeout = 65000;    // > typical load-balancer idle timeout (60s)
server.headersTimeout   = 70000;    // must exceed keepAliveTimeout

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🏛️  Exétasi API running at http://localhost:${PORT}`);
  console.log(`🔌  Socket.io live proctoring enabled`);
  console.log(`⚡  Compression, rate-limiting and connection pooling active\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// Allows in-flight requests to complete before the process exits.
// This is critical when running under a process manager (PM2, systemd, etc.)
// and avoids dropped submissions during server restarts.
const shutdown = (signal) => {
  console.log(`\n[${signal}] Graceful shutdown initiated…`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    require('mongoose').connection.close(false, () => {
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    });
  });

  // Force exit after 15 s if graceful shutdown hangs
  setTimeout(() => {
    console.error('⚠️  Forced exit after timeout.');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections — prevents silent crashes
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Allow a brief moment to flush logs before crashing
  setTimeout(() => process.exit(1), 500);
});
