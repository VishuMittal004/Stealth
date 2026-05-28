const express = require('express');
const UserProfile = require('../models/UserProfile');
const DailyLog = require('../models/DailyLog');
const { requireAuth } = require('../middleware/auth');
const { analyseMeal, suggestMeals } = require('../services/openrouter');
const { getOrCreateLog, saveWithTotals } = require('../services/logService');
const { getLastDateKeys, toDateKey } = require('../services/dateUtils');
const { round } = require('../services/calorieCalculator');

const router = express.Router();
router.use(requireAuth);

async function context() {
  const profile = await UserProfile.findOne();
  const logs = await DailyLog.find({ date: { $in: getLastDateKeys(7) } }).sort({ date: 1 });
  return { profile, logs };
}

router.post('/analyse', async (req, res, next) => {
  try {
    const description = String(req.body.description || '').trim();
    if (!description) return res.status(400).json({ message: 'Meal description is required' });
    const { profile, logs } = await context();
    const analysis = await analyseMeal(description, req.body.meal_type, profile, logs);
    const today = await getOrCreateLog();
    const projected = round(today.daily_calorie_intake) + round(analysis.calories);
    res.json({
      analysis,
      warning: projected > round(profile.daily_calorie_target)
        ? `This meal pushes you to ${projected} kcal, over your ${profile.daily_calorie_target} kcal target. Save only if this is accurate.`
        : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/save', async (req, res, next) => {
  try {
    const meal = req.body.meal;
    if (!meal?.description) return res.status(400).json({ message: 'Analysed meal is required' });
    if (round(meal.calories) > 5000) return res.status(400).json({ message: 'Meal calories must be between 0 and 5000' });
    const log = await getOrCreateLog();
    log.meals.push({
      description: meal.description,
      calories: round(meal.calories),
      protein_g: round(meal.protein_g),
      carbs_g: round(meal.carbs_g),
      fats_g: round(meal.fats_g),
      fiber_g: round(meal.fiber_g),
      sodium_mg: round(meal.sodium_mg),
      sugar_g: round(meal.sugar_g),
      meal_type: meal.meal_type || req.body.meal_type || 'snack',
      ai_analysis: meal.ai_analysis,
      timestamp: new Date(),
    });
    await saveWithTotals(log);
    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const log = await getOrCreateLog(toDateKey());
    log.meals = log.meals.filter((meal) => String(meal._id) !== req.params.id);
    await saveWithTotals(log);
    res.json({ log });
  } catch (error) {
    next(error);
  }
});

router.get('/today', async (req, res, next) => {
  try {
    res.json({ log: await getOrCreateLog() });
  } catch (error) {
    next(error);
  }
});

router.get('/suggestions', async (req, res, next) => {
  try {
    const { profile, logs } = await context();
    const today = await getOrCreateLog();
    res.json({ options: await suggestMeals(profile, today, logs) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
