import { useEffect, useState } from 'react';
import { Activity, BatteryCharging, Brain, Flame, Moon, Smile, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client';
import ProgressBar from '../components/ProgressBar';

const moods = ['Calm', 'Low', 'Angry', 'Focused', 'Tired', 'Good', 'Flat'];

export default function Progress({ profile, reloadProfile }) {
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);
  const [angle, setAngle] = useState('front');
  const [uploadError, setUploadError] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [recalMessage, setRecalMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [selectedMood, setSelectedMood] = useState('Focused');

  async function load() {
    const [{ data: statsData }, { data: reportData }] = await Promise.all([
      api.get('/progress/stats'),
      api.get('/progress/weekly-report'),
    ]);
    setStats(statsData);
    setReport(reportData.report);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function uploadPhoto(event) {
    setUploadError('');
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Photo must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await api.post('/progress/photos', { angle, image_base64: reader.result });
      load().catch(() => {});
    };
    reader.readAsDataURL(file);
  }

  async function recalibrate() {
    setRecalMessage('');
    const { data } = await api.post('/recalibrate', {
      new_weight: Number(newWeight),
      new_goal_weight: newGoal ? Number(newGoal) : undefined,
      mode: 'Continue losing weight',
      timeline_days: 60,
    });
    setRecalMessage(data.recalibration?.commentary || 'Plan recalibrated.');
    reloadProfile?.();
  }

  async function resetEverything() {
    setResetMessage('');
    const confirmed = window.confirm('This will delete your profile, meals, workouts, weight logs, photos, reports, and coach chat. Reset everything?');
    if (!confirmed) return;
    await api.delete('/profile/reset-all');
    localStorage.removeItem('coach_token');
    Object.keys(localStorage)
      .filter((key) => key.startsWith('cache:'))
      .forEach((key) => localStorage.removeItem(key));
    setResetMessage('Everything has been deleted. Restarting setup.');
    setTimeout(() => window.location.reload(), 500);
  }

  if (!stats) return <main className="screen"><div className="card"><p>Loading progress...</p></div></main>;

  const workoutScore = Math.min(100, Math.round((stats.key_stats.workouts_completed / Math.max(1, stats.key_stats.days_elapsed)) * 100));
  const calorieScore = Math.max(0, Math.min(100, Math.round((1 - Math.abs(stats.key_stats.avg_daily_calories_this_week - profile.daily_calorie_target) / Math.max(1, profile.daily_calorie_target)) * 100)));
  const avgSteps = Number(stats.key_stats.avg_steps_this_week) || 0;
  const avgBurn = Number(stats.key_stats.avg_activity_burn_this_week) || 0;
  const stepsScore = Math.min(100, Math.round((avgSteps / Math.max(1, profile.steps_daily_goal || 8000)) * 100));
  const recoveryScore = Math.round((workoutScore + calorieScore + stepsScore) / 3);
  const weekLabels = stats.calorie_trend.map((item) => new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' }));

  return (
    <main className="screen">
      <header className="progress-hero"><h1>Health Overview</h1><p>Calories, training, steps, mood, recovery. One dashboard, no guessing.</p></header>

      <section className="calendar-mood-strip">
        {weekLabels.map((label, index) => (
          <button key={`${label}-${index}`} className={index === weekLabels.length - 1 ? 'active' : ''}>
            <span>{label.split(' ')[0]}</span>
            <strong>{label.split(' ')[1]}</strong>
          </button>
        ))}
      </section>

      <section className="health-overview-card card">
        <div className="overview-rings">
          <div className="ring ring-large" style={{ '--ring': `${calorieScore}%`, '--ring-color': '#D8FF1D' }} />
          <div className="ring ring-mid" style={{ '--ring': `${workoutScore}%`, '--ring-color': '#F4EC8E' }} />
          <div className="ring ring-small" style={{ '--ring': `${stepsScore}%`, '--ring-color': '#AFCF3A' }} />
        </div>
        <div className="overview-stats">
          <div><h2>{workoutScore}%</h2><p>Workout</p></div>
          <div><h2>{calorieScore}%</h2><p>Calories</p></div>
          <div><h2>{stepsScore}%</h2><p>Steps</p></div>
        </div>
      </section>

      <section className="card mood-card screen tight">
        <div className="between">
          <h2>Mood Tracker</h2>
          <span className="soft-pill">Week</span>
        </div>
        <div className="mood-row">
          {moods.map((mood) => (
            <button key={mood} className={selectedMood === mood ? 'active' : ''} onClick={() => setSelectedMood(mood)}>
              <Smile size={18} />
              <span>{mood}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card recovery-card">
        <div className="between">
          <h2>Recovery Score</h2>
          <Moon size={22} />
        </div>
        <div className="recovery-layout">
          <div className="crescent-score"><span>{recoveryScore}%</span></div>
          <div className="recovery-numbers">
            <div><strong>{stats.current_streak}</strong><span>Streak</span></div>
            <div><strong>{avgBurn}</strong><span>Avg Burn</span></div>
            <div><strong>{Math.round(avgSteps).toLocaleString('en-IN')}</strong><span>Avg Steps</span></div>
          </div>
        </div>
      </section>

      <section className="card balance-card screen tight">
        <div className="between">
          <h2>Work/Life Balance</h2>
          <span className="soft-pill">Today</span>
        </div>
        <div className="balance-row"><span><Flame size={16} /> Food Control</span><strong>{calorieScore}%</strong></div>
        <ProgressBar value={calorieScore} max={100} />
        <div className="balance-row"><span><Activity size={16} /> Training</span><strong>{workoutScore}%</strong></div>
        <ProgressBar value={workoutScore} max={100} />
        <div className="balance-row"><span><Zap size={16} /> Movement</span><strong>{stepsScore}%</strong></div>
        <ProgressBar value={stepsScore} max={100} />
      </section>

      <section className="grid-2">
        <div className="card mini-feature-card"><BatteryCharging size={19} /><p className="label">Readiness</p><h2>{recoveryScore}%</h2></div>
        <div className="card mini-feature-card"><Brain size={19} /><p className="label">Mood</p><h2>{selectedMood}</h2></div>
      </section>

      <section className="card screen tight">
        <h2>Weight</h2>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.weight_trend}>
              <CartesianGrid stroke="rgba(255,255,255,.12)" />
              <XAxis dataKey="date" stroke="#A7B1C8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#A7B1C8" domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ background: 'rgba(12,18,32,.92)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 14, color: '#FFFFFF' }} />
              <ReferenceLine y={profile.goal_weight_kg} stroke="#FF4D5E" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="weight_kg" stroke="#D8FF1D" dot={{ fill: '#F4EC8E', stroke: '#FFFFFF', strokeWidth: 1 }} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card screen tight">
        <h2>Calories</h2>
        <div style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.calorie_trend}>
              <CartesianGrid stroke="rgba(255,255,255,.12)" />
              <XAxis dataKey="date" stroke="#A7B1C8" tick={{ fontSize: 10 }} />
              <YAxis stroke="#A7B1C8" />
              <Tooltip contentStyle={{ background: 'rgba(12,18,32,.92)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 14 }} />
              <Bar dataKey="intake" fill="#D8FF1D" radius={[10, 10, 0, 0]} />
              <Bar dataKey="target" fill="#6E7F36" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card screen tight">
        <div className="between"><h2>Consistency</h2><span className="mono accent">{stats.current_streak} day streak</span></div>
        <div className="heatmap">
          {stats.workout_consistency.map((day) => <div key={day.date} className={`heat-cell ${day.status}`} title={`${day.date}: ${day.status}`} />)}
        </div>
      </section>

      <section className="grid-2">
        <div className="card"><p className="label">Kg Lost</p><h2>{stats.key_stats.total_kg_lost}</h2></div>
        <div className="card"><p className="label">Km Run</p><h2>{stats.key_stats.total_km_run}</h2></div>
        <div className="card"><p className="label">Avg Calories</p><h2>{stats.key_stats.avg_daily_calories_this_week}</h2></div>
        <div className="card"><p className="label">Workouts</p><h2>{stats.key_stats.workouts_completed}/{stats.key_stats.days_elapsed}</h2></div>
      </section>

      <section className="card screen tight">
        <h2>Weekly Macro Average</h2>
        <p>Protein {stats.macro_weekly_average.protein_g}g</p><ProgressBar value={stats.macro_weekly_average.protein_g} max={profile.daily_protein_g} />
        <p>Carbs {stats.macro_weekly_average.carbs_g}g</p><ProgressBar value={stats.macro_weekly_average.carbs_g} max={profile.daily_carbs_g} />
        <p>Fats {stats.macro_weekly_average.fats_g}g</p><ProgressBar value={stats.macro_weekly_average.fats_g} max={profile.daily_fats_g} />
      </section>

      <section className="card screen tight">
        <h2>Weekly Report</h2>
        <p className="accent">{report?.ai_weekly_analysis}</p>
        <p>{report?.next_week_strategy}</p>
      </section>

      <section className="card screen tight">
        <h2>Progress Photos</h2>
        <select value={angle} onChange={(event) => setAngle(event.target.value)}>
          <option value="front">Front</option>
          <option value="side">Side</option>
        </select>
        <input className="input" type="file" accept="image/*" onChange={uploadPhoto} />
        {uploadError && <p className="danger">{uploadError}</p>}
        <div className="scroll-row">
          {(stats.photos || []).map((photo, index) => (
            <img key={`${photo.date}-${index}`} src={photo.image_base64} alt={`${photo.angle} ${photo.date}`} style={{ width: 120, height: 160, objectFit: 'cover', border: '1px solid rgba(255,255,255,.18)', borderRadius: 18 }} />
          ))}
        </div>
      </section>

      <section className="card screen tight timeline-reset-card">
        <div className="between">
          <div>
            <p className="label">Full Reset</p>
            <h2>Delete Everything</h2>
          </div>
          <span className="mono danger">Wipe</span>
        </div>
        <p>This deletes the profile, meals, workouts, water, weight logs, progress photos, weekly reports, and AI coach chat. After this, onboarding starts again.</p>
        <button className="button danger" onClick={resetEverything}>Reset Everything</button>
        {resetMessage && <p>{resetMessage}</p>}
      </section>

      <section className="card screen tight">
        <h2>Recalibration</h2>
        <p>Use after Day 60 or when the plan needs a hard reset.</p>
        <input className="input" type="number" min="30" max="250" value={newWeight} onChange={(event) => setNewWeight(event.target.value)} placeholder="New current weight kg" />
        <input className="input" type="number" min="30" max="250" value={newGoal} onChange={(event) => setNewGoal(event.target.value)} placeholder="New goal weight kg" />
        <button className="button" disabled={!newWeight} onClick={recalibrate}>Recalibrate Plan</button>
        {recalMessage && <p className="accent">{recalMessage}</p>}
      </section>
    </main>
  );
}
