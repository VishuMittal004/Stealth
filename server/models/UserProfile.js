const mongoose = require('mongoose');

const RecalibrationSchema = new mongoose.Schema(
  {
    date: Date,
    old_weight: Number,
    new_weight: Number,
    note: String,
  },
  { _id: false }
);

const UserProfileSchema = new mongoose.Schema(
  {
    name: String,
    age: Number,
    weight_kg: Number,
    height_cm: Number,
    metabolism: { type: String, enum: ['slow', 'normal', 'fast'], default: 'slow' },
    fat_zones: [String],
    goal_weight_kg: Number,
    start_date: Date,
    goal_date: Date,
    phase: { type: Number, default: 1 },
    daily_calorie_target: Number,
    daily_protein_g: Number,
    daily_carbs_g: Number,
    daily_fats_g: Number,
    daily_fiber_g: Number,
    water_ml_target: Number,
    steps_daily_goal: Number,
    pin_hash: String,
    created_at: { type: Date, default: Date.now },
    recalibration_history: [RecalibrationSchema],
  },
  { collection: 'user_profile' }
);

module.exports = mongoose.model('UserProfile', UserProfileSchema);
