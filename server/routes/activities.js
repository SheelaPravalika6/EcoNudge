const express = require('express');
const { client } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all activities for user
router.get('/', auth, async (req, res) => {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.userId],
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add activity
router.post('/', auth, async (req, res) => {
  try {
    const { category, activity, carbon_kg, date } = req.body;
    await client.execute({
      sql: 'INSERT INTO activities (user_id, category, activity, carbon_kg, date) VALUES (?, ?, ?, ?, ?)',
      args: [req.userId, category, activity, carbon_kg, date || new Date().toISOString().split('T')[0]],
    });
    const result = await client.execute({
      sql: 'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      args: [req.userId],
    });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete activity
router.delete('/:id', auth, async (req, res) => {
  try {
    await client.execute({
      sql: 'DELETE FROM activities WHERE id = ? AND user_id = ?',
      args: [req.params.id, req.userId],
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;