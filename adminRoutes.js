const express = require('express');
const { pool } = require('./db');
const { requireAuth, requireAdmin } = require('./auth');

const router = express.Router();

// Every route here requires a valid login AND is_admin = true, checked fresh
// against the database on every request (see requireAdmin in auth.js).
router.use(requireAuth, requireAdmin);

// List every business with basic info + usage stats pulled from their data.
router.get('/businesses', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.email, u.created_at, u.is_admin, u.active,
             COALESCE(jsonb_array_length(d.products), 0) AS product_count,
             COALESCE(jsonb_array_length(d.sales), 0) AS sales_count,
             COALESCE(d.sales, '[]'::jsonb) AS sales
      FROM users u
      LEFT JOIN user_data d ON d.user_id = u.id
      ORDER BY u.created_at DESC
    `);

    const businesses = rows.map(r => {
      const revenue = (r.sales || []).reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      return {
        id: r.id,
        username: r.username,
        email: r.email,
        createdAt: r.created_at,
        isAdmin: r.is_admin,
        active: r.active,
        productCount: r.product_count,
        salesCount: r.sales_count,
        revenue,
      };
    });

    return res.json({ ok: true, businesses });
  } catch (err) {
    console.error('list businesses error:', err);
    return res.status(500).json({ ok: false, msg: 'Could not load businesses.' });
  }
});

router.post('/businesses/:id/suspend', async (req, res) => {
  try {
    await pool.query('UPDATE users SET active = false WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('suspend error:', err);
    return res.status(500).json({ ok: false, msg: 'Could not suspend this business.' });
  }
});

router.post('/businesses/:id/activate', async (req, res) => {
  try {
    await pool.query('UPDATE users SET active = true WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('activate error:', err);
    return res.status(500).json({ ok: false, msg: 'Could not activate this business.' });
  }
});

router.post('/businesses/:id/grant-admin', async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('grant-admin error:', err);
    return res.status(500).json({ ok: false, msg: 'Could not grant admin access.' });
  }
});

router.post('/businesses/:id/revoke-admin', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ ok: false, msg: "You can't remove your own admin access." });
    }
    await pool.query('UPDATE users SET is_admin = false WHERE id = $1', [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('revoke-admin error:', err);
    return res.status(500).json({ ok: false, msg: 'Could not revoke admin access.' });
  }
});

module.exports = router;
