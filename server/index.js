const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const setupRoutes = require('./routes/setup');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const mealsRoutes = require('./routes/meals');
const workoutRoutes = require('./routes/workout');
const logsRoutes = require('./routes/logs');
const chatRoutes = require('./routes/chat');
const progressRoutes = require('./routes/progress');
const recalibrateRoutes = require('./routes/recalibrate');
const waterRoutes = require('./routes/water');
const stepsRoutes = require('./routes/steps');
const UserProfile = require('./models/UserProfile');
const DailyLog = require('./models/DailyLog');
const WeeklyReport = require('./models/WeeklyReport');
const { getOrCreateLog } = require('./services/logService');
const { generateWorkoutPlan, generateWeeklyReport } = require('./services/openrouter');
const { getLastDateKeys } = require('./services/dateUtils');

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '3mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/recalibrate', recalibrateRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/steps', stepsRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || 'Server error' });
});

async function generateNightPlan() {
  const profile = await UserProfile.findOne();
  if (!profile) return;
  const log = await getOrCreateLog();
  const logs = await DailyLog.find({ date: { $in: getLastDateKeys(7) } }).sort({ date: 1 });
  if (!log.tomorrow_plan?.run_km) {
    log.tomorrow_plan = await generateWorkoutPlan(profile, logs, log);
    await log.save();
  }
}

async function generateSundayReport() {
  const profile = await UserProfile.findOne();
  if (!profile) return;
  const keys = getLastDateKeys(7);
  const existing = await WeeklyReport.findOne({ start_date: keys[0], end_date: keys[keys.length - 1] });
  if (existing) return;
  const logs = await DailyLog.find({ date: { $in: keys } }).sort({ date: 1 });
  const weekNumber = await WeeklyReport.countDocuments() + 1;
  await WeeklyReport.create(await generateWeeklyReport(profile, logs, weekNumber, keys[0], keys[keys.length - 1]));
}

async function start() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required. Copy .env.example to .env and set your MongoDB connection string.');
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  cron.schedule('0 22 * * *', generateNightPlan, { timezone: 'Asia/Kolkata' });
  cron.schedule('30 22 * * 0', generateSundayReport, { timezone: 'Asia/Kolkata' });
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
