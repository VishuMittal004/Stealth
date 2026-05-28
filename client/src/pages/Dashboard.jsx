import { useEffect, useState } from 'react';
import { Droplets, Flame, Footprints, Gauge, Plus, Scale, Utensils } from 'lucide-react';
import api, {
  activityBurnedFromLog,
  stepsBurnedFromLog,
  stepsCountFromLog,
  stepsGoalFromProfile,
  totalsFromMeals,
  workoutBurnedFromLog,
} from '../api/client';
import { useTodayLog } from '../hooks/useTodayLog';
import CalorieRing from '../components/CalorieRing';
import MacroCard from '../components/MacroCard';
import ProgressBar from '../components/ProgressBar';
import WorkoutPlanCard from '../components/WorkoutPlanCard';
import heroSilhouette from '../assets/hero-vishu-silhouette.png';

export default function Dashboard({ profile, go, reloadProfile }) {
  const { log, setLog, reload } = useTodayLog(Boolean(profile));
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState(null);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [weight, setWeight] = useState('');
  const [stepsGoalInput, setStepsGoalInput] = useState('');
  const [stepsTodayInput, setStepsTodayInput] = useState('');
  const [stepsAddInput, setStepsAddInput] = useState('');
  const totals = totalsFromMeals(log || {});
  const workoutBurned = workoutBurnedFromLog(log);
  const stepsBurned = stepsBurnedFromLog(log);
  const stepsCount = stepsCountFromLog(log);
  const stepsGoal = stepsGoalFromProfile(profile);
  const burned = activityBurnedFromLog(log);
  const day = profile?.start_date ? Math.min(60, Math.floor((new Date() - new Date(profile.start_date)) / 86400000) + 1) : 1;
  const nutritionPct = Math.max(0, Math.min(100, (totals.calories / Math.max(1, profile.daily_calorie_target)) * 100));
  const activeMin = Math.round((Number(log?.workout?.run?.duration_min) || 0) + (stepsCount / 1000) * 8);

  useEffect(() => {
    api.get('/workout/today-plan').then(({ data }) => setPlan(data.plan)).catch(() => {});
    api.get('/progress/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile?.steps_daily_goal) setStepsGoalInput(String(profile.steps_daily_goal));
  }, [profile?.steps_daily_goal]);

  useEffect(() => {
    if (!log) return;
    const count = stepsCountFromLog(log);
    setStepsTodayInput(count > 0 ? String(count) : '');
  }, [log]);

  async function addWater() {
    const { data } = await api.post('/water/log', { amount_ml: 250 });
    setLog(data.log);
  }

  async function saveStepsGoal() {
    const goal = Number(stepsGoalInput);
    if (!goal || goal < 1) return;
    await api.patch('/profile', { steps_daily_goal: goal });
    setStepsGoalInput(String(goal));
    reloadProfile?.();
  }

  async function saveTodaySteps() {
    const count = Number(stepsTodayInput);
    if (Number.isNaN(count) || count < 0) return;
    const { data } = await api.post('/steps/log', { count });
    setLog(data.log);
    setStepsTodayInput(String(stepsCountFromLog(data.log)));
  }

  async function addStepsFromInput() {
    const add = Number(stepsAddInput);
    if (!add || add < 1) return;
    const { data } = await api.post('/steps/log', { steps: add });
    setLog(data.log);
    setStepsAddInput('');
    setStepsTodayInput(String(stepsCountFromLog(data.log)));
  }

  async function saveWeight() {
    if (!weight) return;
    await api.patch('/profile', { weight_kg: Number(weight) });
    setWeight('');
    reload();
  }

  async function setDayType(dayType) {
    const { data } = await api.patch('/logs/today', { day_type: dayType });
    setLog(data.log);
  }

  if (!log) return <div className="screen"><div className="card"><p>Loading dashboard...</p></div></div>;

  return (
    <main className="screen home-screen">
      <section className="home-hero">
        <div className="hero-topline">
          <div className="hero-copy">
            <p>Hello</p>
            <h1>{profile.name}</h1>
          </div>
          <div className="hero-time">{clock}</div>
        </div>
        <div className="hero-body-art" aria-hidden="true">
          <img className="hero-portrait" src={heroSilhouette} alt="" />
          <span className="body-glow glow-left" />
          <span className="body-glow glow-right" />
        </div>
        <div className="metric-pill pill-steps">
          <Footprints size={14} />
          {(stepsCount || 0).toLocaleString('en-IN')} Steps
        </div>
        <div className="metric-pill pill-calories">
          <Flame size={14} />
          {(totals.calories / 1000).toFixed(1)}K Calories
        </div>
      </section>

      {stats?.alerts?.map((alert) => <div className="card danger" key={alert}>{alert}</div>)}

      <section className="nutrition-ruler card">
        <div className="between">
          <div className="row"><Utensils size={18} /><h3>Nutrition</h3></div>
          <span>{Math.round(nutritionPct)}%</span>
        </div>
        <div className="ruler-track">
          <div className="ruler-fill" style={{ width: `${nutritionPct}%` }} />
          <span className="ruler-marker" style={{ left: `${nutritionPct}%` }} />
        </div>
        <div className="between small">
          <span>0</span>
          <span>{Math.round(totals.calories)} / {profile.daily_calorie_target} kcal</span>
        </div>
      </section>

      <div className="home-stat-grid">
        <section className="stat-card active-min-card">
          <div className="between"><span className="label">Active Min</span><Gauge size={17} /></div>
          <div className="mini-dial" style={{ '--dial': `${Math.min(100, activeMin)}%` }}><span /></div>
          <h2>{activeMin}</h2>
        </section>
        <section className="stat-card">
          <span className="label">Calories Burned</span>
          <h2>{burned.toLocaleString('en-IN')}</h2>
          <p>Workout {workoutBurned} - Steps {stepsBurned}</p>
        </section>
        <section className="stat-card">
          <span className="label">Daily Steps</span>
          <h2>{stepsCount.toLocaleString('en-IN')}</h2>
          <p>{stepsGoal ? `${stepsGoal.toLocaleString('en-IN')} goal` : 'Set your goal'}</p>
        </section>
        <section className="stat-card">
          <span className="label">Day {day}</span>
          <h2>{log.weight_kg || profile.weight_kg} kg</h2>
          <p>Goal {profile.goal_weight_kg} kg</p>
        </section>
      </div>

      <section className="macro-strip">
        <MacroCard label="Protein" value={totals.protein_g} target={profile.daily_protein_g} />
        <MacroCard label="Carbs" value={totals.carbs_g} target={profile.daily_carbs_g} />
        <MacroCard label="Fats" value={totals.fats_g} target={profile.daily_fats_g} />
        <MacroCard label="Fiber" value={totals.fiber_g} target={profile.daily_fiber_g} />
      </section>

      <section className="card screen tight">
        <div className="between">
          <h3>Water</h3>
          <span className="mono accent">{log.water_ml_consumed || 0} / {profile.water_ml_target} ml</span>
        </div>
        <ProgressBar value={log.water_ml_consumed || 0} max={profile.water_ml_target} />
        <button className="button secondary" onClick={addWater}><Droplets size={18} /> +250ml</button>
      </section>

      <section className="card screen tight">
        <div className="between">
          <h3>Steps</h3>
          <span className="mono accent">
            {stepsCount.toLocaleString('en-IN')}
            {stepsGoal > 0 ? ` / ${stepsGoal.toLocaleString('en-IN')}` : ' today'}
          </span>
        </div>
        {stepsGoal > 0 && <ProgressBar value={stepsCount} max={stepsGoal} />}
        <p className="small">Walking burn: <span className="accent mono">{stepsBurned} kcal</span> (counts toward net calories)</p>

        <p className="label">Daily step goal</p>
        <div className="row">
          <input
            className="input"
            type="number"
            min="1"
            max="100000"
            value={stepsGoalInput}
            onChange={(event) => setStepsGoalInput(event.target.value)}
            placeholder="e.g. 7500"
          />
          <button type="button" className="button secondary" onClick={saveStepsGoal}>Save goal</button>
        </div>

        <p className="label">Today&apos;s steps</p>
        <div className="row">
          <input
            className="input"
            type="number"
            min="0"
            max="100000"
            value={stepsTodayInput}
            onChange={(event) => setStepsTodayInput(event.target.value)}
            placeholder="Total steps today"
          />
          <button type="button" className="button" onClick={saveTodaySteps}><Footprints size={18} /></button>
        </div>

        <p className="label">Add more steps</p>
        <div className="row">
          <input
            className="input"
            type="number"
            min="1"
            max="100000"
            value={stepsAddInput}
            onChange={(event) => setStepsAddInput(event.target.value)}
            placeholder="Steps to add"
          />
          <button type="button" className="button secondary" onClick={addStepsFromInput}>Add</button>
        </div>
      </section>

      <section className="screen tight">
        <div className="between">
          <h2>Workout</h2>
          <span className={log.workout?.completed ? 'accent mono' : 'danger mono'}>{log.workout?.completed ? 'Done' : 'Pending'}</span>
        </div>
        {log.workout?.completed ? (
          <div className="card">
            <p>
              Burned <span className="accent">{Math.round(burned)} kcal</span>
              {stepsBurned > 0 && <> (workout {workoutBurned} + steps {stepsBurned})</>}.
              Run logged: {log.workout.run?.actual_km || 0} km.
            </p>
          </div>
        ) : (
          <>
            {stepsCount > 0 && (
              <div className="card">
                <p>
                  <Footprints size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  {stepsCount.toLocaleString('en-IN')} steps logged - <span className="accent">{stepsBurned} kcal</span> from walking
                </p>
              </div>
            )}
            <WorkoutPlanCard plan={plan} />
          </>
        )}
      </section>

      <section className="card screen tight">
        <p className="label">AI Coach</p>
        <p className="accent">{log.ai_daily_summary || plan?.coach_message || 'No excuses today. Log food honestly, run first, and finish the circuit.'}</p>
        {stats?.current_streak > 0 && <p>Current streak: <span className="accent mono">{stats.current_streak} days</span>. Do not break it.</p>}
      </section>

      <section className="card screen tight">
        <div className="between"><h3>Day Type</h3><span className="mono accent">{log.day_type || 'normal'}</span></div>
        <div className="scroll-row">
          {[
            ['normal', 'Normal'],
            ['partial_fast', 'Partial fast'],
            ['cheat_day', 'Cheat day'],
          ].map(([value, label]) => <button key={value} className={`chip ${log.day_type === value ? 'active' : ''}`} onClick={() => setDayType(value)}>{label}</button>)}
        </div>
      </section>

      <CalorieRing
        consumed={totals.calories}
        burned={burned}
        target={profile.daily_calorie_target}
        workoutBurned={workoutBurned}
        stepsBurned={stepsBurned}
      />

      <section className="card screen tight">
        <div className="between"><h3>Log Weight</h3><Scale size={18} color="#D8FF1D" /></div>
        <div className="row">
          <input className="input" type="number" min="30" max="250" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Today kg" />
          <button className="button" onClick={saveWeight}><Plus size={18} /></button>
        </div>
      </section>
    </main>
  );
}
