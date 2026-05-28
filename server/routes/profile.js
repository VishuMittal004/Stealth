const express = require('express');
const UserProfile = require('../models/UserProfile');
const DailyLog = require('../models/DailyLog');
const WeeklyReport = require('../models/WeeklyReport');
const ChatLog = require('../models/ChatLog');
const { requireAuth } = require('../middleware/auth');
const { addDays, toDateKey } = require('../services/dateUtils');
const { estimateStepsCalories, round } = require('../services/calorieCalculator');
const { getOrCreateLog, saveWithTotals } = require('../services/logService');

const router = express.Router();

function clean(profile) {
  if (!profile) return null;
  const data = profile.toObject ? profile.toObject() : profile;
  delete data.pin_hash;
  return data;
}

router.get('/', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    if (!profile) return res.json({ exists: false, profile: null });
    if (!req.headers.authorization) return res.status(401).json({ exists: true, message: 'PIN required' });
    return requireAuth(req, res, () => res.json({ exists: true, profile: clean(profile) }));
  } catch (error) {
    next(error);
  }
});

router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    if (req.body.weight_kg !== undefined) {
      const weight = Number(req.body.weight_kg);
      if (weight < 30 || weight > 250) return res.status(400).json({ message: 'Weight must be between 30 and 250 kg' });
      profile.weight_kg = weight;
      const log = await getOrCreateLog();
      log.weight_kg = weight;
      if (round(log.steps?.count) > 0) {
        log.steps = log.steps || { count: 0, calories_burned: 0 };
        log.steps.calories_burned = estimateStepsCalories(weight, log.steps.count);
        log.steps.updated_at = new Date();
      }
      await saveWithTotals(log);
    }
    if (req.body.steps_daily_goal !== undefined) {
      const goal = round(req.body.steps_daily_goal);
      if (goal < 1 || goal > 100000) {
        return res.status(400).json({ message: 'Daily steps goal must be between 1 and 100,000' });
      }
      profile.steps_daily_goal = goal;
    }
    if (req.body.start_day !== undefined) {
      const startDay = Number(req.body.start_day);
      if (!Number.isInteger(startDay) || startDay < 1 || startDay > 60) {
        return res.status(400).json({ message: 'Start day must be between 1 and 60' });
      }
      const newStartDate = addDays(new Date(), 1 - startDay);
      profile.start_date = newStartDate;
      profile.goal_date = addDays(newStartDate, 60);
    }
    ['name', 'metabolism', 'goal_weight_kg'].forEach((field) => {
      if (req.body[field] !== undefined) profile[field] = req.body[field];
    });
    await profile.save();
    res.json({ profile: clean(profile) });
  } catch (error) {
    next(error);
  }
});

router.delete('/reset-all', requireAuth, async (req, res, next) => {
  try {
    await Promise.all([
      UserProfile.deleteMany({}),
      DailyLog.deleteMany({}),
      WeeklyReport.deleteMany({}),
      ChatLog.deleteMany({}),
    ]);
    res.json({ message: 'All app data has been deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
