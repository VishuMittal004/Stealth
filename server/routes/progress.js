const express = require('express');
const UserProfile = require('../models/UserProfile');
const DailyLog = require('../models/DailyLog');
const WeeklyReport = require('../models/WeeklyReport');
const { requireAuth } = require('../middleware/auth');
const { getLastDateKeys, daysBetween, toDateKey } = require('../services/dateUtils');
const { generateWeeklyReport } = require('../services/openrouter');
const { round } = require('../services/calorieCalculator');

const router = express.Router();
router.use(requireAuth);

function computeStreak(logs, target) {
  let streak = 0;
  [...logs].reverse().some((log) => {
    const ok = log.workout?.completed && round(log.daily_calorie_intake) <= round(target);
    if (ok) streak += 1;
    return !ok;
  });
  return streak;
}

function computeAlerts(profile, logs) {
  const alerts = [];
  const now = new Date();
  const hour = now.getHours();
  const today = logs.find((log) => log.date === toDateKey());
  if (hour >= 20 && (!today || !today.meals?.length)) alerts.push("It's after 8 PM and no meal is logged. Log honestly before the day becomes useless data.");

  const weights = logs.filter((log) => log.weight_kg).map((log) => log.weight_kg);
  if (weights.length >= 10) {
    const lastTen = weights.slice(-10);
    if (Math.max(...lastTen) - Math.min(...lastTen) < 0.3) {
      alerts.push(`You've been around ${lastTen[lastTen.length - 1]} kg for 10 days. Tighten portions and add HIIT intervals to the run.`);
    }
  }

  const completed21 = logs.slice(-21).filter((log) => log.workout?.completed).length;
  if (logs.length >= 21 && completed21 >= 18) alerts.push('Three weeks of solid consistency. Next week can be a deload: lighter circuits, same diet discipline.');

  return alerts;
}

router.get('/stats', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    const keys = getLastDateKeys(60);
    const logs = await DailyLog.find({ date: { $in: keys } }).sort({ date: 1 });
    const weights = logs.filter((log) => log.weight_kg).map((log) => ({ date: log.date, weight_kg: log.weight_kg }));
    const calories = keys.slice(-7).map((date) => {
      const log = logs.find((item) => item.date === date);
      return { date, intake: round(log?.daily_calorie_intake), target: round(profile.daily_calorie_target) };
    });
    const consistency = keys.map((date) => {
      const log = logs.find((item) => item.date === date);
      return { date, status: log?.workout?.completed ? 'done' : log?.workout?.status === 'skipped' ? 'skipped' : 'none' };
    });
    const currentWeek = logs.slice(-7);
    const macroTotals = currentWeek.reduce((sum, log) => {
      (log.meals || []).forEach((meal) => {
        sum.protein_g += round(meal.protein_g);
        sum.carbs_g += round(meal.carbs_g);
        sum.fats_g += round(meal.fats_g);
      });
      return sum;
    }, { protein_g: 0, carbs_g: 0, fats_g: 0 });
    const startWeight = profile.weight_kg;
    const lastWeight = weights[weights.length - 1]?.weight_kg || startWeight;
    res.json({
      weight_trend: weights,
      calorie_trend: calories,
      workout_consistency: consistency,
      current_streak: computeStreak(logs, profile.daily_calorie_target),
      alerts: computeAlerts(profile, logs),
      macro_weekly_average: {
        protein_g: round(macroTotals.protein_g / Math.max(1, currentWeek.length)),
        carbs_g: round(macroTotals.carbs_g / Math.max(1, currentWeek.length)),
        fats_g: round(macroTotals.fats_g / Math.max(1, currentWeek.length)),
      },
      key_stats: {
        total_kg_lost: Number((startWeight - lastWeight).toFixed(1)),
        total_km_run: Number(logs.reduce((sum, log) => sum + (Number(log.workout?.run?.actual_km) || 0), 0).toFixed(1)),
        total_steps: logs.reduce((sum, log) => sum + round(log.steps?.count), 0),
        avg_steps_this_week: round(currentWeek.reduce((sum, log) => sum + round(log.steps?.count), 0) / Math.max(1, currentWeek.length)),
        avg_activity_burn_this_week: round(currentWeek.reduce((sum, log) => sum + round(log.workout?.total_calories_burned) + round(log.steps?.calories_burned), 0) / Math.max(1, currentWeek.length)),
        avg_daily_calories_this_week: round(currentWeek.reduce((sum, log) => sum + round(log.daily_calorie_intake), 0) / Math.max(1, currentWeek.length)),
        workouts_completed: logs.filter((log) => log.workout?.completed).length,
        days_elapsed: profile.start_date ? daysBetween(new Date(profile.start_date)) + 1 : 1,
      },
      photos: logs.flatMap((log) => log.progress_photos || []),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/weekly-report', async (req, res, next) => {
  try {
    let report = await WeeklyReport.findOne().sort({ end_date: -1 });
    if (!report) {
      const profile = await UserProfile.findOne();
      const keys = getLastDateKeys(7);
      const logs = await DailyLog.find({ date: { $in: keys } }).sort({ date: 1 });
      report = await WeeklyReport.create(await generateWeeklyReport(profile, logs, 1, keys[0], keys[keys.length - 1]));
    }
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

router.post('/photos', async (req, res, next) => {
  try {
    const image = String(req.body.image_base64 || '');
    if (!image) return res.status(400).json({ message: 'Photo is required' });
    if (Buffer.byteLength(image, 'utf8') > 2 * 1024 * 1024) return res.status(400).json({ message: 'Photo must be under 2MB' });
    const log = await DailyLog.findOneAndUpdate({ date: req.body.date || toDateKey() }, { $setOnInsert: { date: req.body.date || toDateKey() } }, { upsert: true, new: true });
    log.progress_photos.push({ date: req.body.date || toDateKey(), angle: req.body.angle || 'front', image_base64: image });
    await log.save();
    res.status(201).json({ photos: log.progress_photos });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
