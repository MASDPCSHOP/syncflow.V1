const { Pool } = require('pg');

// DATABASE_URL example: postgresql://user:password@host:5432/dbname
// Managed providers (Render, Railway, Supabase, RDS, Azure) give you this
// connection string directly - paste it into .env as DATABASE_URL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Errors on idle clients (e.g. connection dropped) should not crash
  // in-flight requests, but they do need to be visible in logs.
  console.error('Unexpected error on idle PostgreSQL client', err);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection };
