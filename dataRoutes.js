const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT products, sales, services, expenses, bookings, categories FROM user_data WHERE user_id = $1',
      [req.user.id]
    );
    const empty = { products: [], sales: [], services: [], expenses: [], bookings: [], categories: [] };
    return res.json({ ok: true, data: rows[0] || empty });
  } catch (err) {
    console.error('get data error:', err);
    return res.status(500).json({ ok: false, msg: 'Could not load data.' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const { products = [], sales = [], services = [], expenses = [], bookings = [], categories = [] } = req.body || {};
    await pool.query(
      `INSERT INTO user_data (user_id, products, sales, services, expenses, bookings, categories, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (user_id) DO UPDATE SET
         products = EXCLUDED.products,
         sales = EXCLUDED.sales,
         services = EXCLUDED.services,
         expenses = EXCLUDED.expenses,
         bookings = EXCLUDED.bookings,
         categories = EXCLUDED.categories,
         updated_at = now()`,
      [req.user.id, JSON.stringify(products), JSON.stringify(sales), JSON.stringify(services),
       JSON.stringify(expenses), JSON.stringify(bookings), JSON.stringify(categories)]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error('save data error:', err);
    return res.status(500).json({ ok: false, msg: 'Could not save data.' });
  }
});

module.exports = router;
