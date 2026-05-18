const express = require('express');
const { db } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/user/stats
router.get('/stats', (req, res) => {
  const userId = req.userId;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  const activitiesLogged = db.prepare('SELECT COUNT(*) as count FROM activities WHERE user_id = ?').get(userId).count;
  const totalCo2 = db.prepare('SELECT COALESCE(SUM(co2_kg), 0) as total FROM activities WHERE user_id = ?').get(userId).total;
  const tasksCompleted = db.prepare('SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ?').get(userId).count;
  const totalPoints = db.prepare('SELECT COALESCE(SUM(points_earned), 0) as total FROM user_tasks WHERE user_id = ?').get(userId).total;
  const lowestDay = db.prepare(`
    SELECT MIN(daily_total) as min FROM (
      SELECT date, SUM(co2_kg) as daily_total FROM activities WHERE user_id = ? GROUP BY date
    )
  `).get(userId).min;

  res.json({
    email: user.email,
    displayName: user.display_name,
    city: user.city,
    country: user.country,
    units: user.units,
    memberSince: user.created_at,
    activitiesLogged,
    totalCo2: parseFloat((totalCo2 || 0).toFixed(2)),
    tasksCompleted,
    totalPoints,
    lowestDailyCo2: lowestDay ? parseFloat(lowestDay.toFixed(2)) : null,
    currentStreak: user.current_streak || 0,
    longestStreak: user.longest_streak || 0,
    onboarding_done: user.onboarding_done
  });
});

// PUT /api/user/profile
router.put('/profile', (req, res) => {
  const { displayName, city, country, units } = req.body;
  db.prepare(`
    UPDATE users SET display_name = ?, city = ?, country = ?, units = ? WHERE id = ?
  `).run(displayName || null, city || 'Hyderabad', country || 'India', units || 'kg', req.userId);
  res.json({ message: 'Profile updated' });
});

// PUT /api/user/onboarding
router.put('/onboarding', (req, res) => {
  db.prepare('UPDATE users SET onboarding_done = 1 WHERE id = ?').run(req.userId);
  res.json({ message: 'Onboarding complete' });
});

// DELETE /api/user/data
router.delete('/data', (req, res) => {
  db.prepare('DELETE FROM activities WHERE user_id = ?').run(req.userId);
  db.prepare('DELETE FROM user_tasks WHERE user_id = ?').run(req.userId);
  db.prepare('UPDATE users SET current_streak = 0, last_logged_date = NULL WHERE id = ?').run(req.userId);
  res.json({ message: 'All data deleted' });
});

// POST /api/user/suggestions
router.post('/suggestions', async (req, res) => {
  const userId = req.userId;
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const activities = db.prepare(`
    SELECT date, category, activity_name, amount, unit, co2_kg
    FROM activities WHERE user_id = ? AND date >= ?
    ORDER BY date DESC
  `).all(userId, weekStart);

  const user = db.prepare('SELECT city FROM users WHERE id = ?').get(userId);
  const cityAvg = db.prepare('SELECT avg_daily_co2_kg FROM city_averages WHERE city = ?').get(user.city || 'Hyderabad');

  const userAvgRow = db.prepare(`
    SELECT AVG(daily_total) as avg FROM (
      SELECT date, SUM(co2_kg) as daily_total FROM activities
      WHERE user_id = ? AND date >= ? GROUP BY date
    )
  `).get(userId, weekStart);

  const userAvg = (userAvgRow.avg || 0).toFixed(2);
  const cityAvgVal = cityAvg ? cityAvg.avg_daily_co2_kg : 5.2;

  try {
    const suggestions = [];

    // Find top emission category
    const categoryTotals = {};
    for (const a of activities) {
      categoryTotals[a.category] = (categoryTotals[a.category] || 0) + a.co2_kg;
    }
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    // Suggestion 1 — based on top category
    if (topCategory) {
      const [cat, val] = topCategory;
      if (cat === 'transport') suggestions.push(`🚗 Transport is your biggest emission source at ${val.toFixed(1)} kg CO₂ this week. Try switching to bus or train for at least 2 trips to cut this significantly.`);
      if (cat === 'food') suggestions.push(`🍽️ Food accounts for most of your emissions at ${val.toFixed(1)} kg CO₂ this week. Try replacing one meat meal per day with a vegetarian option to reduce this.`);
      if (cat === 'energy') suggestions.push(`⚡ Energy use is your top emission at ${val.toFixed(1)} kg CO₂ this week. Try reducing AC usage by 2 degrees and unplugging devices when not in use.`);
      if (cat === 'shopping') suggestions.push(`🛍️ Shopping is your biggest footprint at ${val.toFixed(1)} kg CO₂ this week. Try avoiding online orders for the next 7 days to make a big impact.`);
    }

    // Suggestion 2 — based on city average comparison
    if (parseFloat(userAvg) > cityAvgVal) {
      suggestions.push(`📊 You are currently ${(parseFloat(userAvg) - cityAvgVal).toFixed(1)} kg/day above your city average. Try logging all your activities daily so you can spot where to cut back.`);
    } else {
      suggestions.push(`🎉 Great job! You are ${(cityAvgVal - parseFloat(userAvg)).toFixed(1)} kg/day below your city average. Keep it up and try to maintain this streak for the whole week.`);
    }

    // Suggestion 3 — based on missing categories
    const hasTransport = activities.some(a => a.category === 'transport');
    const hasFood = activities.some(a => a.category === 'food');
    if (!hasFood) {
      suggestions.push(`🌱 You haven't logged any food activities this week. Food can be a major emission source — try tracking your meals to get a clearer picture.`);
    } else if (!hasTransport) {
      suggestions.push(`🚌 You haven't logged transport this week. Even short car trips add up — try tracking your commute to see where you can save.`);
    } else {
      suggestions.push(`💡 Small daily habits make a big difference. Try one new eco action today like a cold wash, skipping meat, or walking instead of driving.`);
    }

    res.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Could not get suggestions.' });
  }
});

module.exports = router;