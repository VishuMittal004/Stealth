const express = require('express');
const UserProfile = require('../models/UserProfile');
const DailyLog = require('../models/DailyLog');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateLog, saveWithTotals } = require('../services/logService');
const { addDays, getLastDateKeys, toDateKey } = require('../services/dateUtils');
const { estimateRunCalories, estimateExerciseCalories, round } = require('../services/calorieCalculator');
const { generateWorkoutPlan, generateDailySummary } = require('../services/openrouter');

const router = express.Router();
router.use(requireAuth);

async function last7Logs() {
  return DailyLog.find({ date: { $in: getLastDateKeys(7) } }).sort({ date: 1 });
}

async function getTodayAssignedPlan(profile) {
  const todayKey = toDateKey();
  const yesterdayKey = toDateKey(addDays(new Date(), -1));
  const yesterday = await DailyLog.findOne({ date: yesterdayKey });
  if (yesterday?.tomorrow_plan?.run_km) return { plan: yesterday.tomorrow_plan, source: yesterdayKey };

  const today = await getOrCreateLog(todayKey);
  if (!today.tomorrow_plan?.run_km) {
    today.tomorrow_plan = await generateWorkoutPlan(profile, await last7Logs(), today);
    await today.save();
  }
  return { plan: today.tomorrow_plan, source: todayKey };
}

router.get('/today-plan', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    res.json(await getTodayAssignedPlan(profile));
  } catch (error) {
    next(error);
  }
});

router.post('/log', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    const log = await getOrCreateLog();
    const status = req.body.status || (req.body.completed ? 'completed' : 'skipped');
    const actualKm = Number(req.body.actual_km) || 0;
    const duration = Number(req.body.duration_min) || 0;
    if (actualKm < 0 || actualKm > 20) return res.status(400).json({ message: 'Run distance must be between 0 and 20 km' });

    const runCalories = status === 'skipped' ? 0 : estimateRunCalories(profile.weight_kg, actualKm);
    const exerciseMinutes = Array.isArray(req.body.exercises)
      ? req.body.exercises.filter((exercise) => exercise.completed).length * 4
      : status === 'completed'
        ? 24
        : 10;
    const exerciseCalories = status === 'skipped' ? 0 : estimateExerciseCalories(profile.weight_kg, exerciseMinutes, status === 'completed' ? 6 : 4.5);

    log.workout = {
      completed: status === 'completed',
      status,
      skipped_reason: req.body.reason || '',
      run: {
        planned_km: Number(req.body.planned_km) || 0,
        actual_km: actualKm,
        duration_min: duration,
        calories_burned: runCalories,
      },
      exercises: (req.body.exercises || []).map((exercise) => ({
        ...exercise,
        calories_burned: exercise.completed ? round(exerciseCalories / Math.max(1, req.body.exercises.length)) : 0,
      })),
      total_calories_burned: runCalories + exerciseCalories,
      workout_feedback: req.body.feedback || '',
    };

    const logs = await last7Logs();
    const summary = await generateDailySummary(profile, log, logs);
    log.ai_daily_summary = summary.ai_daily_summary;
    log.tomorrow_plan = summary.tomorrow_plan || await generateWorkoutPlan(profile, logs, log);
    await saveWithTotals(log);
    res.json({ log, tomorrow_plan: log.tomorrow_plan });
  } catch (error) {
    next(error);
  }
});

router.post('/generate-plan', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    const log = await getOrCreateLog(req.body.date || toDateKey());
    log.tomorrow_plan = await generateWorkoutPlan(profile, await last7Logs(), log);
    await log.save();
    res.json({ plan: log.tomorrow_plan });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
