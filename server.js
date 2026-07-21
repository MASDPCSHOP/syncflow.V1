require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./authRoutes');
const dataRoutes = require('./dataRoutes');
const { testConnection } = require('./db');

const app = express();

// Render sits in front of this app as a reverse proxy, so Express needs to
// trust the X-Forwarded-For header it sets. "1" means trust exactly one
// hop (Render's proxy) — this is what express-rate-limit needs to
// correctly identify clients instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '100kb' }));

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: false,
  })
);

app.get('/health', (req, res) => res.json({ ok: true, service: 'syncflow-auth-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

app.use((req, res) => res.status(404).json({ ok: false, msg: 'Not found' }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, msg: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await testConnection();
    console.log('Database connection OK');
  } catch (err) {
    console.error('Failed to connect to database on startup:', err.message);
    console.error('Check DATABASE_URL in your .env file.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`SyncFlow auth API listening on port ${PORT}`);
  });
}

start();
