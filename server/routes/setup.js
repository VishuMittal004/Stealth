const express = require('express');
const bcrypt = require('bcryptjs');
const UserProfile = require('../models/UserProfile');
const { getOrCreateLog } = require('../services/logService');
const { addDays } = require('../services/dateUtils');
const { calculateProfilePlan, generateWorkoutPlan } = require('../services/openrouter');
const { signSession } = require('../middleware/auth');
const { round } = require('../services/calorieCalculator');

const router = express.Router();

function validateSetup(body) {
  if (!/^\d{4}$/.test(String(body.pin || ''))) return 'PIN must be exactly 4 digits';
  if (body.weight_kg < 30 || body.weight_kg > 250) return 'Weight must be between 30 and 250 kg';
  if (body.height_cm < 120 || body.height_cm > 230) return 'Height must be realistic';
  if (body.goal_weight_kg < 30 || body.goal_weight_kg > 250) return 'Goal weight must be between 30 and 250 kg';
  return null;
}

router.post('/', async (req, res, next) => {
  try {
    const existing = await UserProfile.findOne();
    if (existing) {
      const pinValid = await bcrypt.compare(String(req.body.pin || ''), existing.pin_hash);
      if (!pinValid) return res.status(409).json({ message: 'Profile already exists. Refresh and unlock with your PIN.' });
      const todayLog = await getOrCreateLog();
      if (!todayLog.tomorrow_plan?.run_km) {
        todayLog.tomorrow_plan = await generateWorkoutPlan(existing, [], todayLog);
        await todayLog.save();
      }
      const clean = existing.toObject();
      delete clean.pin_hash;
      return res.json({ profile: clean, today_plan: todayLog.tomorrow_plan, token: signSession(existing._id) });
    }

    const validation = validateSetup(req.body);
    if (validation) return res.status(400).json({ message: validation });

    const start = new Date();
    const goal = addDays(start, 60);
    const targets = await calculateProfilePlan(req.body);
    const stepsGoal = round(req.body.steps_daily_goal);
    const profile = await UserProfile.create({
      name: req.body.name,
      age: Number(req.body.age),
      weight_kg: Number(req.body.weight_kg),
      height_cm: Number(req.body.height_cm),
      metabolism: req.body.metabolism,
      fat_zones: req.body.fat_zones || [],
      goal_weight_kg: Number(req.body.goal_weight_kg),
      start_date: start,
      goal_date: goal,
      phase: 1,
      ...targets,
      ...(stepsGoal >= 1 && stepsGoal <= 100000 ? { steps_daily_goal: stepsGoal } : {}),
      pin_hash: await bcrypt.hash(String(req.body.pin), 12),
      created_at: start,
      recalibration_history: [],
    });

    const todayLog = await getOrCreateLog();
    todayLog.tomorrow_plan = await generateWorkoutPlan(profile, [], todayLog);
    await todayLog.save();

    const clean = profile.toObject();
    delete clean.pin_hash;
    res.status(201).json({ profile: clean, today_plan: todayLog.tomorrow_plan, token: signSession(profile._id) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
