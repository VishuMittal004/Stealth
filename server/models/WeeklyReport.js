const mongoose = require('mongoose');

const WeeklyReportSchema = new mongoose.Schema(
  {
    week_number: Number,
    start_date: String,
    end_date: String,
    avg_daily_calories: Number,
    avg_calories_burned: Number,
    total_km_run: Number,
    workouts_completed: Number,
    workouts_missed: Number,
    weight_start: Number,
    weight_end: Number,
    weight_delta: Number,
    ai_weekly_analysis: String,
    next_week_strategy: String,
  },
  { collection: 'weekly_reports', timestamps: true }
);

module.exports = mongoose.model('WeeklyReport', WeeklyReportSchema);
