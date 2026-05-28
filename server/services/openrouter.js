const { stripEmojis } = require('./emojiStripper');
const { calculateTargets, estimateRunCalories, estimateExerciseCalories, round } = require('./calorieCalculator');
const { daysBetween } = require('./dateUtils');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

function extractJson(text) {
  const stripped = String(text || '').replace(/```json|```/g, '').trim();
  const firstObject = stripped.indexOf('{');
  const lastObject = stripped.lastIndexOf('}');
  if (firstObject >= 0 && lastObject > firstObject) {
    return stripped.slice(firstObject, lastObject + 1);
  }
  const firstArray = stripped.indexOf('[');
  const lastArray = stripped.lastIndexOf(']');
  if (firstArray >= 0 && lastArray > firstArray) {
    return stripped.slice(firstArray, lastArray + 1);
  }
  return stripped;
}

function normalizeTextList(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const name = item.name || item.movement || item.exercise || item.title || 'Movement';
      const duration = item.duration_sec ? ` (${Math.round(Number(item.duration_sec) / 60) || item.duration_sec}s)` : '';
      return `${name}${duration}`;
    })
    .filter(Boolean);
}

function normalizeExercise(exercise = {}) {
  return {
    name: String(exercise.name || exercise.exercise || 'Bodyweight movement'),
    sets: exercise.sets === undefined ? undefined : round(exercise.sets),
    reps: exercise.reps === undefined ? undefined : round(exercise.reps),
    duration_sec: exercise.duration_sec === undefined ? undefined : round(exercise.duration_sec),
    rest_sec: exercise.rest_sec === undefined ? undefined : round(exercise.rest_sec),
    focus: String(exercise.focus || exercise.target_fat_zone || exercise.target_zone || 'Full Body'),
  };
}

function normalizeWorkoutPlan(plan, fallback) {
  const source = plan && typeof plan === 'object' ? plan : {};
  const normalized = {
    run_km: Number(source.run_km ?? source.running?.km ?? fallback?.run_km ?? 1.5),
    run_duration_min: round(source.run_duration_min ?? source.running?.duration_min ?? fallback?.run_duration_min ?? 15),
    warmup: normalizeTextList(source.warmup?.movements || source.warmup || fallback?.warmup),
    cooldown: normalizeTextList(source.cooldown?.movements || source.cooldown || fallback?.cooldown),
    exercises: (Array.isArray(source.exercises) && source.exercises.length ? source.exercises : fallback?.exercises || []).map(normalizeExercise),
    estimated_total_time_min: round(source.estimated_total_time_min ?? source.total_estimated_time_min ?? fallback?.estimated_total_time_min ?? 60),
    estimated_calories_burned: round(source.estimated_calories_burned ?? source.total_calories_burned ?? fallback?.estimated_calories_burned ?? 250),
    calorie_target_adjustment: round(source.calorie_target_adjustment ?? fallback?.calorie_target_adjustment ?? 0),
    coach_message: stripEmojis(String(source.coach_message || source.instruction || fallback?.coach_message || 'Run first, finish the circuit, and keep the session honest.')),
  };
  if (!normalized.warmup.length) normalized.warmup = ['Arm circles', 'High knees', 'Hip rotations', 'Bodyweight squats', 'Light jog'];
  if (!normalized.cooldown.length) normalized.cooldown = ['Slow walk', 'Hamstring stretch', 'Quad stretch', 'Chest opener', 'Deep breathing'];
  return normalized;
}

async function callOpenRouter({ system, user, json = false }) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Personal AI Fitness Coach',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1600,
      temperature: json ? 0.2 : 0.45,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const text = stripEmojis(data.choices?.[0]?.message?.content || '');
  if (!json) return text;

  try {
    return stripEmojis(JSON.parse(extractJson(text)));
  } catch (error) {
    const retry = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Personal AI Fitness Coach',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1600,
        temperature: 0,
        messages: [
          { role: 'system', content: `${system}\nYour previous answer was not valid JSON. Return strictly parseable JSON only. No markdown. No commentary.` },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!retry.ok) {
      const body = await retry.text();
      throw new Error(`OpenRouter JSON retry failed: ${retry.status} ${body}`);
    }
    const retryData = await retry.json();
    const retryText = stripEmojis(retryData.choices?.[0]?.message?.content || '');
    return stripEmojis(JSON.parse(extractJson(retryText)));
  }
}

function fallbackMealAnalysis(description) {
  const text = String(description || '').toLowerCase();
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  let fiber = 0;
  let sugar = 0;
  let sodium = 450;

  const add = (c, p, cb, f, fi, s = 0) => {
    calories += c;
    protein += p;
    carbs += cb;
    fats += f;
    fiber += fi;
    sugar += s;
  };

  const rotiCount = text.includes('teen') || text.includes('3') ? 3 : text.includes('do') || text.includes('2') ? 2 : text.includes('roti') ? 1 : 0;
  if (rotiCount) add(rotiCount * 110, rotiCount * 3.5, rotiCount * 22, rotiCount * 1, rotiCount * 3);
  if (text.includes('dal')) add(180, 9, 24, 5, 6);
  if (text.includes('chawal') || text.includes('rice')) add(text.includes('plate bhar') ? 450 : 230, 5, text.includes('plate bhar') ? 96 : 48, 1, 1);
  if (text.includes('rajma')) add(240, 13, 38, 4, 11);
  if (text.includes('paratha')) add(300, 7, 38, 13, 5);
  if (text.includes('butter')) add(100, 0, 0, 11, 0);
  if (text.includes('chai')) add(90, 3, 12, 3, 0, 10);
  if (text.includes('lassi')) add(180, 6, 28, 5, 0, 24);
  if (text.includes('sabzi')) add(160, 4, 18, 8, 6);
  if (text.includes('paneer')) add(280, 18, 8, 20, 1);
  if (!calories) add(350, 10, 45, 12, 4, 6);

  return {
    calories: round(calories),
    protein_g: round(protein),
    carbs_g: round(carbs),
    fats_g: round(fats),
    fiber_g: round(fiber),
    sodium_mg: round(sodium + fats * 20),
    sugar_g: round(sugar),
    ai_analysis: calories > 650 ? 'Heavy meal. Keep the next meal protein-heavy and cut extra carbs.' : 'Manageable meal. Add protein if the rest of the day is still low.',
  };
}

function fallbackWorkoutPlan(profile, logs = []) {
  const start = profile?.start_date ? new Date(profile.start_date) : new Date();
  const day = daysBetween(start) + 1;
  const week = Math.ceil(day / 7);
  const runKm = week <= 2 ? 1.5 : week <= 4 ? 2.5 : week <= 6 ? 3.5 : 4.5;
  const runDuration = Math.round(runKm * (week <= 2 ? 10 : week <= 4 ? 9 : 8));
  const hard = week >= 5;
  const peak = week >= 7;
  const exercises = [
    { name: 'Crunches', sets: hard ? 4 : 3, reps: peak ? 25 : hard ? 20 : 15, focus: 'Belly', rest_sec: 45 },
    { name: week >= 3 ? 'Push-ups' : 'Incline push-ups', sets: hard ? 4 : 3, reps: peak ? 18 : hard ? 15 : 10, focus: 'Chest', rest_sec: 60 },
    { name: 'Mountain climbers', sets: hard ? 4 : 3, duration_sec: peak ? 45 : hard ? 35 : 25, focus: 'Belly', rest_sec: 45 },
    { name: 'Squats', sets: hard ? 4 : 3, reps: peak ? 25 : hard ? 20 : 15, focus: 'Lower Body', rest_sec: 45 },
    { name: 'Side planks', sets: 3, duration_sec: peak ? 40 : 25, focus: 'Love Handles', rest_sec: 45 },
  ];
  const exerciseMinutes = peak ? 32 : hard ? 28 : 24;
  const estimated = estimateRunCalories(profile?.weight_kg, runKm) + estimateExerciseCalories(profile?.weight_kg, exerciseMinutes, hard ? 6.5 : 5.5);
  return {
    run_km: runKm,
    run_duration_min: runDuration,
    warmup: ['Arm circles', 'High knees', 'Hip rotations', 'Bodyweight squats', 'Light jog'],
    cooldown: ['Slow walk', 'Hamstring stretch', 'Quad stretch', 'Chest opener', 'Deep breathing'],
    exercises,
    estimated_total_time_min: Math.min(60, 10 + runDuration + exerciseMinutes),
    estimated_calories_burned: estimated,
    calorie_target_adjustment: 0,
    coach_message: logs.some((log) => log.workout?.status === 'skipped')
      ? 'No more missed sessions. Start with the run and finish the circuit even if the pace is slow.'
      : 'Run first, then finish every set. Keep the session inside 60 minutes and do not negotiate with fatigue.',
  };
}

async function calculateProfilePlan(profileInput) {
  const fallback = calculateTargets(profileInput);
  try {
    const result = await callOpenRouter({
      json: true,
      system: `You are a certified fitness and nutrition expert specializing in fat loss for Indian males with slow metabolism.
Given the user's stats, calculate:
1. Daily calorie target for 0.5-0.6 kg/week fat loss (do not go below 1600 kcal for a 100kg male)
2. Protein target: 1.6g per kg of goal body weight
3. Carbs: fill remaining calories after protein and fat (fat = 25% of calories)
4. Fiber: 30-35g/day
5. Water: 3.5-4 litres/day given his weight and climate (India)
6. Week-by-week calorie progression (slight deficit increase as body adapts)
Return only structured JSON with keys daily_calorie_target, daily_protein_g, daily_carbs_g, daily_fats_g, daily_fiber_g, water_ml_target, weekly_calorie_progression. No explanation. No emojis.`,
      user: JSON.stringify(profileInput),
    });
    return { ...fallback, ...result };
  } catch (error) {
    return fallback;
  }
}

async function analyseMeal(description, mealType, profile, logs) {
  try {
    return await callOpenRouter({
      json: true,
      system: `You are a nutritionist with deep expertise in Indian food and desi eating habits.
The user will describe what they ate in Hindi, English, or Hinglish.
You must identify food items, estimate portions from context, calculate nutrition, and write a 1-2 line honest, direct comment. Return strictly valid JSON:
{"calories": 0, "protein_g": 0, "carbs_g": 0, "fats_g": 0, "fiber_g": 0, "sodium_mg": 0, "sugar_g": 0, "ai_analysis": ""}
No markdown. No explanation. No emojis.`,
      user: JSON.stringify({ description, meal_type: mealType, profile, last_7_days: logs }),
    });
  } catch (error) {
    return fallbackMealAnalysis(description);
  }
}

async function generateWorkoutPlan(profile, logs, todayLog) {
  const fallback = fallbackWorkoutPlan(profile, logs);
  try {
    const start = profile?.start_date ? new Date(profile.start_date) : new Date();
    const day = daysBetween(start) + 1;
    const result = await callOpenRouter({
      json: true,
      system: `You are a home fitness coach for a 22-year-old Indian male, 100 kg, 5'10", slow metabolism.
Primary fat zones: belly, chest, love handles, hips, thighs. Equipment: zero.
Total workout time: 60 minutes including 5 min warm-up and 5 min cool-down. Running is always first.
Week 1-2 easy, Week 3-4 medium, Week 5-6 hard, Week 7-8 peak. Generate tomorrow's complete workout plan as JSON with:
run_km, run_duration_min, warmup, cooldown, exercises [{name, sets, reps, duration_sec, rest_sec, focus}], estimated_total_time_min, estimated_calories_burned, calorie_target_adjustment, coach_message.
Strict, direct, no emojis. No markdown.`,
      user: JSON.stringify({ day_of_60: day, profile, last_7_days: logs, today_log: todayLog }),
    });
    return normalizeWorkoutPlan(result, fallback);
  } catch (error) {
    return fallback;
  }
}

async function generateDailySummary(profile, log, logs) {
  const fallbackPlan = fallbackWorkoutPlan(profile, logs);
  try {
    const result = await callOpenRouter({
      json: true,
      system: `You are a strict AI personal trainer. Review today's full log and generate structured JSON only:
{"ai_daily_summary":"","tomorrow_plan":{"run_km":0,"run_duration_min":0,"warmup":[],"cooldown":[],"exercises":[],"estimated_total_time_min":0,"estimated_calories_burned":0,"calorie_target_adjustment":0,"coach_message":""}}
Be honest and direct. No emojis. Address overeating and skipped workouts.`,
      user: JSON.stringify({ profile, today_log: log, last_7_days: logs }),
    });
    return {
      ai_daily_summary: stripEmojis(String(result.ai_daily_summary || 'Day reviewed. Keep the next session tight and log everything cleanly.')),
      tomorrow_plan: normalizeWorkoutPlan(result.tomorrow_plan, fallbackPlan),
    };
  } catch (error) {
    return {
      ai_daily_summary: log.daily_net_calories > profile.daily_calorie_target
        ? 'Calories crossed the target. Tomorrow needs cleaner portions, more protein, and no extra sugar.'
        : 'Day is under control. Keep protein high, finish water, and do not skip the next workout.',
      tomorrow_plan: fallbackPlan,
    };
  }
}

async function coachChat(message, databaseContext, history) {
  try {
    return await callOpenRouter({
      system: `You are Vishu's personal AI fitness and diet coach. You are strict, knowledgeable, and direct.
Speak in whatever language the user writes in: Hindi, English, or Hinglish.
Rules: Never use emojis. Never give generic advice. If user missed workout, acknowledge it and redirect immediately.
Suggest only Indian foods and no-equipment home exercises. Be supportive but never soft when the user is slacking.
You have the full app database snapshot for this single user: user profile, all daily logs, all weekly reports, and recent chat history. Use the full database context to answer with specific numbers, dates, trends, misses, and next actions.`,
      user: JSON.stringify({ user_message: message, database: databaseContext, recent_chat: history }),
    });
  } catch (error) {
    return 'Seedha answer: aaj ka target hit karo. Protein complete rakho, sugar avoid karo, aur workout miss hua hai toh 20 minute brisk walk plus 3 rounds squats, push-ups, mountain climbers abhi karo.';
  }
}

async function suggestMeals(profile, todayLog, logs) {
  const consumed = (todayLog.meals || []).reduce(
    (sum, meal) => ({
      calories: sum.calories + round(meal.calories),
      protein_g: sum.protein_g + round(meal.protein_g),
      carbs_g: sum.carbs_g + round(meal.carbs_g),
      fats_g: sum.fats_g + round(meal.fats_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 }
  );
  try {
    const result = await callOpenRouter({
      json: true,
      system: `Suggest 2-3 specific Indian meals based on remaining macros. Return JSON:
{"options":[{"name":"","calories":0,"protein_g":0,"reason":""}]}
No emojis. No markdown. Keep advice strict and practical.`,
      user: JSON.stringify({ profile, consumed, today_log: todayLog, last_7_days: logs }),
    });
    return result.options || [];
  } catch (error) {
    const proteinLeft = Math.max(0, round(profile.daily_protein_g) - consumed.protein_g);
    return [
      { name: 'Paneer bhurji with 2 roti', calories: 520, protein_g: 32, reason: `Good if you still need around ${proteinLeft}g protein.` },
      { name: 'Moong dal chilla with curd', calories: 430, protein_g: 28, reason: 'Cleaner carbs and better protein than fried snacks.' },
      { name: 'Sattu in water with roasted chana', calories: 300, protein_g: 20, reason: 'Use this if calories are tight but protein is low.' },
    ];
  }
}

async function generateWeeklyReport(profile, logs, weekNumber, startDate, endDate) {
  const workoutsCompleted = logs.filter((log) => log.workout?.completed).length;
  const weights = logs.map((log) => log.weight_kg).filter(Boolean);
  const report = {
    week_number: weekNumber,
    start_date: startDate,
    end_date: endDate,
    avg_daily_calories: round(logs.reduce((sum, log) => sum + round(log.daily_calorie_intake), 0) / Math.max(1, logs.length)),
    avg_calories_burned: round(
      logs.reduce((sum, log) => sum + round(log.workout?.total_calories_burned) + round(log.steps?.calories_burned), 0) / Math.max(1, logs.length)
    ),
    total_steps: round(logs.reduce((sum, log) => sum + round(log.steps?.count), 0)),
    total_km_run: Number(logs.reduce((sum, log) => sum + (Number(log.workout?.run?.actual_km) || 0), 0).toFixed(1)),
    workouts_completed: workoutsCompleted,
    workouts_missed: logs.length - workoutsCompleted,
    weight_start: weights[0] || profile.weight_kg,
    weight_end: weights[weights.length - 1] || profile.weight_kg,
    weight_delta: weights.length ? Number((weights[weights.length - 1] - weights[0]).toFixed(1)) : 0,
  };
  try {
    const ai = await callOpenRouter({
      json: true,
      system: `Generate a weekly fat-loss report for an Indian home-workout user. Return JSON:
{"ai_weekly_analysis":"","next_week_strategy":""}
Be specific, strict, and direct. No emojis.`,
      user: JSON.stringify({ profile, logs, report }),
    });
    return { ...report, ...ai };
  } catch (error) {
    return {
      ...report,
      ai_weekly_analysis: workoutsCompleted >= 5 ? 'Workout consistency was acceptable. Keep diet tighter and protect the calorie deficit.' : 'Workout consistency was weak. Next week needs completed sessions before diet excuses.',
      next_week_strategy: 'Run first each session, keep dinner lower-carb, and hit protein before adding rice or sweets.',
    };
  }
}

async function recalibrate(profile, history, payload) {
  const targets = await calculateProfilePlan({ ...profile.toObject(), weight_kg: payload.new_weight, goal_weight_kg: payload.new_goal_weight || profile.goal_weight_kg });
  return {
    ...targets,
    workout_intensity_baseline: 'Rebuild from the current running capacity, then increase weekly if 5 of 7 workouts are completed.',
    commentary: 'The next phase starts from today. Keep the logs complete or the plan cannot tighten accurately.',
  };
}

module.exports = {
  calculateProfilePlan,
  analyseMeal,
  generateWorkoutPlan,
  generateDailySummary,
  coachChat,
  suggestMeals,
  generateWeeklyReport,
  recalibrate,
};
