const DailyLog = require('../models/DailyLog');
const { toDateKey } = require('./dateUtils');
const { recalcDailyTotals } = require('./calorieCalculator');

async function getOrCreateLog(date = toDateKey()) {
  let log = await DailyLog.findOne({ date });
  if (!log) {
    log = await DailyLog.create({
      date,
      meals: [],
      workout: { completed: false, status: 'planned', total_calories_burned: 0 },
      water_ml_consumed: 0,
      steps: { count: 0, calories_burned: 0 },
      daily_calorie_intake: 0,
      daily_net_calories: 0,
    });
  }
  return log;
}

async function saveWithTotals(log) {
  recalcDailyTotals(log);
  return log.save();
}

module.exports = { getOrCreateLog, saveWithTotals };
