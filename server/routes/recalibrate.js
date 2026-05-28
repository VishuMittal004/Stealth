const express = require('express');
const UserProfile = require('../models/UserProfile');
const DailyLog = require('../models/DailyLog');
const { requireAuth } = require('../middleware/auth');
const { addDays, toDateKey } = require('../services/dateUtils');
const { recalibrate } = require('../services/openrouter');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const newWeight = Number(req.body.new_weight);
    if (newWeight < 30 || newWeight > 250) return res.status(400).json({ message: 'Weight must be between 30 and 250 kg' });
    const profile = await UserProfile.findOne();
    const logs = await DailyLog.find().sort({ date: 1 });
    const oldWeight = profile.weight_kg;
    const result = await recalibrate(profile, logs, req.body);
    profile.weight_kg = newWeight;
    if (req.body.new_goal_weight) profile.goal_weight_kg = Number(req.body.new_goal_weight);
    profile.start_date = new Date();
    profile.goal_date = addDays(new Date(), Number(req.body.timeline_days) || 60);
    profile.phase += 1;
    profile.daily_calorie_target = result.daily_calorie_target;
    profile.daily_protein_g = result.daily_protein_g;
    profile.daily_carbs_g = result.daily_carbs_g;
    profile.daily_fats_g = result.daily_fats_g;
    profile.daily_fiber_g = result.daily_fiber_g;
    profile.water_ml_target = result.water_ml_target;
    profile.recalibration_history.push({
      date: new Date(),
      old_weight: oldWeight,
      new_weight: newWeight,
      note: result.commentary || req.body.mode || 'Manual recalibration',
    });
    await profile.save();
    const clean = profile.toObject();
    delete clean.pin_hash;
    res.json({ profile: clean, recalibration: result, date: toDateKey() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
