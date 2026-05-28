const express = require('express');
const UserProfile = require('../models/UserProfile');
const { requireAuth } = require('../middleware/auth');
const { getOrCreateLog, saveWithTotals } = require('../services/logService');
const { estimateStepsCalories, round } = require('../services/calorieCalculator');

const router = express.Router();
router.use(requireAuth);

const MAX_STEPS = 100000;

function applySteps(log, count, weightKg) {
  log.steps = log.steps || { count: 0, calories_burned: 0 };
  log.steps.count = Math.max(0, Math.min(MAX_STEPS, round(count)));
  log.steps.calories_burned = estimateStepsCalories(weightKg, log.steps.count);
  log.steps.updated_at = new Date();
  return log;
}

router.post('/log', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne();
    const weightKg = profile?.weight_kg || 100;
    const log = await getOrCreateLog();

    if (req.body.count !== undefined) {
      applySteps(log, req.body.count, weightKg);
    } else {
      const add = round(req.body.steps || 1000);
      if (add <= 0) return res.status(400).json({ message: 'Steps increment must be greater than 0' });
      const current = round(log.steps?.count);
      applySteps(log, current + add, weightKg);
    }

    await saveWithTotals(log);
    res.json({ log });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
