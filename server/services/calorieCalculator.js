function round(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function calculateTargets(profile) {
  const weight = Number(profile.weight_kg) || 100;
  const height = Number(profile.height_cm) || 178;
  const age = Number(profile.age) || 22;
  const goalWeight = Number(profile.goal_weight_kg) || Math.max(70, weight - 10);
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const activityFactor = profile.metabolism === 'fast' ? 1.42 : profile.metabolism === 'normal' ? 1.35 : 1.28;
  const tdee = bmr * activityFactor;
  const target = Math.max(1600, Math.min(2300, Math.round(tdee - 600)));
  const protein = Math.round(goalWeight * 1.6);
  const fatCalories = target * 0.25;
  const fats = Math.round(fatCalories / 9);
  const carbs = Math.round((target - protein * 4 - fatCalories) / 4);

  return {
    daily_calorie_target: target,
    daily_protein_g: protein,
    daily_carbs_g: Math.max(80, carbs),
    daily_fats_g: fats,
    daily_fiber_g: 35,
    water_ml_target: weight >= 95 ? 4000 : 3500,
    weekly_calorie_progression: [
      { week: 1, calories: target + 100 },
      { week: 2, calories: target + 50 },
      { week: 3, calories: target },
      { week: 4, calories: target },
      { week: 5, calories: Math.max(1600, target - 50) },
      { week: 6, calories: Math.max(1600, target - 50) },
      { week: 7, calories: Math.max(1600, target - 100) },
      { week: 8, calories: Math.max(1600, target - 100) },
    ],
  };
}

function estimateRunCalories(weightKg, km) {
  return round((Number(weightKg) || 100) * (Number(km) || 0) * 1.03);
}

function estimateExerciseCalories(weightKg, minutes, intensity = 5.5) {
  return round(((intensity * 3.5 * (Number(weightKg) || 100)) / 200) * (Number(minutes) || 0));
}

function estimateStepsCalories(weightKg, steps) {
  const weight = Number(weightKg) || 100;
  const count = Math.max(0, round(steps));
  // ~0.04 kcal/step at 70 kg, scaled by body weight (brisk walking)
  return round(count * 0.04 * (weight / 70));
}

function getWorkoutCaloriesBurned(log) {
  return round(log?.workout?.total_calories_burned);
}

function getStepsCaloriesBurned(log) {
  return round(log?.steps?.calories_burned);
}

function getTotalCaloriesBurned(log) {
  return getWorkoutCaloriesBurned(log) + getStepsCaloriesBurned(log);
}

function recalcDailyTotals(log) {
  const meals = log.meals || [];
  const intake = meals.reduce((sum, meal) => sum + round(meal.calories), 0);
  const burned = getTotalCaloriesBurned(log);
  log.daily_calorie_intake = intake;
  log.daily_net_calories = intake - burned;
  return log;
}

module.exports = {
  calculateTargets,
  estimateRunCalories,
  estimateExerciseCalories,
  estimateStepsCalories,
  getWorkoutCaloriesBurned,
  getStepsCaloriesBurned,
  getTotalCaloriesBurned,
  recalcDailyTotals,
  round,
};
