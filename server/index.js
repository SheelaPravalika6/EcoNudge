require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/user', require('./routes/user'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

const PORT = process.env.PORT || 5000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🌿 EcoNudge server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database init failed:', err);
});