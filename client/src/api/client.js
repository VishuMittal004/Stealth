import axios from 'axios';

function normalizeApiBaseUrl(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return '/api';

  if (rawValue.startsWith('/')) {
    const apiIndex = rawValue.split('/').findIndex((part) => part === 'api');
    if (apiIndex >= 0) {
      return `/${rawValue.split('/').slice(1, apiIndex + 1).join('/')}`;
    }
    return rawValue === '/api' ? rawValue : '/api';
  }

  try {
    const url = new URL(rawValue);
    const parts = url.pathname.split('/').filter(Boolean);
    const apiIndex = parts.findIndex((part) => part === 'api');
    url.pathname = apiIndex >= 0 ? `/${parts.slice(0, apiIndex + 1).join('/')}` : '/api';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '/api';
  }
}

const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || '/api');

const api = axios.create({ baseURL: apiBaseUrl });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('coach_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get') {
      localStorage.setItem(`cache:${response.config.url}`, JSON.stringify(response.data));
    }
    return response;
  },
  (error) => {
    if (!error.response && error.config?.method === 'get') {
      const cached = localStorage.getItem(`cache:${error.config.url}`);
      if (cached) return Promise.resolve({ data: JSON.parse(cached), cached: true });
    }
    return Promise.reject(error);
  }
);

export default api;

function normalizeLog(log) {
  return log && typeof log === 'object' ? log : {};
}

export function workoutBurnedFromLog(log) {
  const entry = normalizeLog(log);
  return Math.round(Number(entry.workout?.total_calories_burned) || 0);
}

export function stepsBurnedFromLog(log) {
  const entry = normalizeLog(log);
  return Math.round(Number(entry.steps?.calories_burned) || 0);
}

export function stepsCountFromLog(log) {
  const entry = normalizeLog(log);
  return Math.round(Number(entry.steps?.count) || 0);
}

export function activityBurnedFromLog(log) {
  return workoutBurnedFromLog(log) + stepsBurnedFromLog(log);
}

export function stepsGoalFromProfile(profile) {
  return Math.round(Number(profile?.steps_daily_goal) || 0);
}

export function totalsFromMeals(log) {
  return (normalizeLog(log).meals || []).reduce(
    (sum, meal) => ({
      calories: sum.calories + Number(meal.calories || 0),
      protein_g: sum.protein_g + Number(meal.protein_g || 0),
      carbs_g: sum.carbs_g + Number(meal.carbs_g || 0),
      fats_g: sum.fats_g + Number(meal.fats_g || 0),
      fiber_g: sum.fiber_g + Number(meal.fiber_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 }
  );
}
