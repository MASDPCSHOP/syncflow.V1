const jwt = require('jsonwebtoken');
const { pool } = require('./db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ ok: false, msg: 'Missing or invalid authorization header' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, msg: 'Invalid or expired token' });
  }
}

// Checks the CURRENT is_admin value in the database (not something baked
// into the JWT), so revoking admin access takes effect immediately rather
// than waiting for the token to expire.
async function requireAdmin(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!rows[0] || !rows[0].is_admin) {
      return res.status(403).json({ ok: false, msg: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ ok: false, msg: 'Something went wrong' });
  }
}

module.exports = { requireAuth, requireAdmin };
