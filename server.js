require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const { testConnection } = require('./config/db');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '100kb' }));

// CORS_ORIGIN can be a comma-separated list, e.g.
// "https://myapp.com,http://localhost:5500"
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

// 404 handler
app.use((req, res) => res.status(404).json({ ok: false, msg: 'Not found' }));

// Central error handler (catches anything thrown/next(err) that wasn't handled)
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
