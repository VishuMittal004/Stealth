const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema(
  {
    description: String,
    calories: Number,
    protein_g: Number,
    carbs_g: Number,
    fats_g: Number,
    fiber_g: Number,
    sodium_mg: Number,
    sugar_g: Number,
    meal_type: String,
    timestamp: { type: Date, default: Date.now },
    ai_analysis: String,
  },
  { _id: true }
);

const ExerciseSchema = new mongoose.Schema(
  {
    name: String,
    sets: Number,
    reps: Number,
    duration_sec: Number,
    calories_burned: Number,
    focus: String,
    completed: Boolean,
  },
  { _id: false }
);

const TomorrowExerciseSchema = new mongoose.Schema(
  {
    name: String,
    sets: Number,
    reps: Number,
    duration_sec: Number,
    focus: String,
    rest_sec: Number,
  },
  { _id: false }
);

const DailyLogSchema = new mongoose.Schema(
  {
    date: { type: String, unique: true, index: true },
    meals: [MealSchema],
    workout: {
      completed: { type: Boolean, default: false },
      status: { type: String, enum: ['planned', 'completed', 'partial', 'skipped'], default: 'planned' },
      skipped_reason: String,
      run: {
        planned_km: Number,
        actual_km: Number,
        duration_min: Number,
        calories_burned: Number,
      },
      exercises: [ExerciseSchema],
      total_calories_burned: { type: Number, default: 0 },
      workout_feedback: String,
    },
    water_ml_consumed: { type: Number, default: 0 },
    steps: {
      count: { type: Number, default: 0 },
      calories_burned: { type: Number, default: 0 },
      updated_at: Date,
    },
    weight_kg: Number,
    daily_calorie_intake: { type: Number, default: 0 },
    daily_net_calories: { type: Number, default: 0 },
    ai_daily_summary: String,
    day_type: { type: String, enum: ['normal', 'partial_fast', 'cheat_day'], default: 'normal' },
    progress_photos: [
      {
        date: String,
        angle: String,
        image_base64: String,
        created_at: { type: Date, default: Date.now },
      },
    ],
    ai_alerts: [String],
    tomorrow_plan: {
      run_km: Number,
      run_duration_min: Number,
      warmup: [String],
      cooldown: [String],
      estimated_calories_burned: Number,
      estimated_total_time_min: Number,
      exercises: [TomorrowExerciseSchema],
      calorie_target_adjustment: Number,
      coach_message: String,
    },
  },
  { collection: 'daily_logs', timestamps: true }
);

module.exports = mongoose.model('DailyLog', DailyLogSchema);
