const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  try {
    const activities = db.prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, (req, res) => {
  try {
    const { category, activity, carbon_kg, date } = req.body;
    const result = db.prepare('INSERT INTO activities (user_id, category, activity, carbon_kg, date) VALUES (?, ?, ?, ?, ?)')
      .run(req.userId, category, activity, carbon_kg, date || new Date().toISOString().split('T')[0]);
    const newActivity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
    res.json(newActivity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    db.prepare('DELETE FROM activities WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;