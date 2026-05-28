import { useMemo, useState } from 'react';
import { Activity, CalendarDays, Flame, Gauge, LockKeyhole, Ruler, Scale, Target, User } from 'lucide-react';
import api from '../api/client';

const zones = ['belly', 'chest', 'love_handles', 'hips', 'thighs'];
const stepLabels = ['Stats', 'Engine', 'Zones', 'Target', 'PIN'];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: 'Vishu',
    age: 22,
    weight_kg: 100,
    height_cm: 178,
    metabolism: 'slow',
    fat_zones: ['belly', 'chest', 'love_handles', 'hips', 'thighs'],
    goal_weight_kg: 90,
    pin: '',
  });

  const goalDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 60);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleZone(zone) {
    setForm((current) => ({
      ...current,
      fat_zones: current.fat_zones.includes(zone)
        ? current.fat_zones.filter((item) => item !== zone)
        : [...current.fat_zones, zone],
    }));
  }

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/setup', form);
      localStorage.setItem('coach_token', data.token);
      setPlan(data.profile);
    } catch (err) {
      setError(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  if (plan) {
    return (
      <main className="app-shell setup-shell">
        <section className="setup-hero">
          <p className="label accent">Plan locked</p>
          <h1>{plan.daily_calorie_target} kcal</h1>
          <p>Targets are calculated. Now the app tracks the work every day.</p>
        </section>
        <div className="card setup-card screen">
          <div className="grid-2">
            <div className="metric-tile"><p className="label">Protein</p><h2>{plan.daily_protein_g}g</h2></div>
            <div className="metric-tile"><p className="label">Carbs</p><h2>{plan.daily_carbs_g}g</h2></div>
            <div className="metric-tile"><p className="label">Fats</p><h2>{plan.daily_fats_g}g</h2></div>
            <div className="metric-tile"><p className="label">Fiber</p><h2>{plan.daily_fiber_g}g</h2></div>
          </div>
          <div className="plan-strip">
            <span>Water</span>
            <strong>{plan.water_ml_target} ml</strong>
          </div>
          <div className="plan-strip">
            <span>Goal</span>
            <strong>{plan.weight_kg} kg to {plan.goal_weight_kg} kg</strong>
          </div>
          <div className="plan-strip">
            <span>Deadline</span>
            <strong>{new Date(plan.goal_date).toLocaleDateString('en-IN')}</strong>
          </div>
          <button className="button" onClick={onDone}>Enter App</button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell setup-shell">
      <section className="setup-hero">
        <div className="between">
          <p className="label accent">Single user coach</p>
          <span className="mono accent">Step {step}/5</span>
        </div>
        <h1>Build the cut plan.</h1>
        <p>Enter the real numbers. The coach will use these to set food, running, and bodyweight targets.</p>
      </section>

      <section className="step-rail">
        {stepLabels.map((label, index) => (
          <button key={label} className={`step-dot ${step === index + 1 ? 'active' : ''} ${step > index + 1 ? 'done' : ''}`} onClick={() => setStep(index + 1)}>
            <span>{index + 1}</span>
            <small>{label}</small>
          </button>
        ))}
      </section>

      <div className="progress-track setup-progress"><div className="progress-fill" style={{ '--value': `${step * 20}%` }} /></div>
      {error && <div className="card error-card"><p className="danger">{error}</p></div>}
      {loading && (
        <div className="card setup-card screen">
          <div className="loading-bars"><span /><span /><span /></div>
          <h2>Calculating your plan...</h2>
          <p>OpenRouter is setting calorie targets, macros, water, and Day 1 training.</p>
        </div>
      )}

      {!loading && step === 1 && (
        <section className="card setup-card screen">
          <h2>Body Stats</h2>
          <label className="field-label"><User size={18} /> Name<input className="input" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Name" /></label>
          <div className="grid-2">
            <label className="field-label"><Activity size={18} /> Age<input className="input" type="number" value={form.age} onChange={(event) => update('age', Number(event.target.value))} placeholder="Age" /></label>
            <label className="field-label"><Scale size={18} /> Weight<input className="input" type="number" min="30" max="250" value={form.weight_kg} onChange={(event) => update('weight_kg', Number(event.target.value))} placeholder="kg" /></label>
          </div>
          <label className="field-label"><Ruler size={18} /> Height<input className="input" type="number" value={form.height_cm} onChange={(event) => update('height_cm', Number(event.target.value))} placeholder="cm" /></label>
        </section>
      )}
      {!loading && step === 2 && (
        <section className="screen">
          {['slow', 'normal', 'fast'].map((type) => (
            <button key={type} className={`select-card ${form.metabolism === type ? 'active' : ''}`} onClick={() => update('metabolism', type)}>
              <Gauge size={20} />
              <span>
                <strong>{type.toUpperCase()}</strong>
                <small>{type === 'slow' ? 'Tighter calories, no missed runs.' : type === 'normal' ? 'Standard deficit response.' : 'Higher burn, still tracked.'}</small>
              </span>
            </button>
          ))}
        </section>
      )}
      {!loading && step === 3 && (
        <section className="card setup-card screen">
          <h2>Fat Zones</h2>
          <div className="zone-grid">
          {zones.map((zone) => (
            <button key={zone} className={`zone-button ${form.fat_zones.includes(zone) ? 'active' : ''}`} onClick={() => toggleZone(zone)}>
              {zone.replace('_', ' ')}
            </button>
          ))}
          </div>
        </section>
      )}
      {!loading && step === 4 && (
        <section className="card setup-card screen">
          <h2>Target</h2>
          <label className="field-label"><Target size={18} /> Goal weight<input className="input" type="number" min="30" max="250" value={form.goal_weight_kg} onChange={(event) => update('goal_weight_kg', Number(event.target.value))} placeholder="Goal weight kg" /></label>
          <div className="command-panel">
            <div><CalendarDays size={20} /><span>60 days</span></div>
            <strong>{goalDate}</strong>
          </div>
        </section>
      )}
      {!loading && step === 5 && (
        <section className="card setup-card screen">
          <h2>Access PIN</h2>
          <label className="field-label"><LockKeyhole size={18} /> Four digits<input className="input mono pin-input" type="password" inputMode="numeric" maxLength="4" value={form.pin} onChange={(event) => update('pin', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" /></label>
          <div className="pin-meter">
            {[0, 1, 2, 3].map((item) => <span key={item} className={form.pin.length > item ? 'active' : ''} />)}
          </div>
        </section>
      )}
      {!loading && (
        <div className="action-dock">
          <button className="button secondary" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>Back</button>
          {step < 5 ? <button className="button" onClick={() => setStep((value) => value + 1)}>Next</button> : <button className="button" onClick={submit}><Flame size={18} /> Calculate Plan</button>}
        </div>
      )}
    </main>
  );
}
