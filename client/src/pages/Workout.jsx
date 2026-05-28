import { useEffect, useState } from 'react';
import api, { activityBurnedFromLog, stepsBurnedFromLog, stepsCountFromLog, workoutBurnedFromLog } from '../api/client';
import WorkoutPlanCard from '../components/WorkoutPlanCard';

export default function Workout() {
  const [plan, setPlan] = useState(null);
  const [log, setLog] = useState(null);
  const [status, setStatus] = useState('completed');
  const [actualKm, setActualKm] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [doneExercises, setDoneExercises] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/workout/today-plan').then(({ data }) => {
      setPlan(data.plan);
      setActualKm(data.plan?.run_km || '');
      setDuration(data.plan?.run_duration_min || '');
    }).catch(() => {});
    api.get('/logs/today').then(({ data }) => setLog(data.log)).catch(() => {});
  }, []);

  function toggle(index) {
    setDoneExercises((current) => ({ ...current, [index]: !current[index] }));
  }

  async function submit() {
    setBusy(true);
    const exercises = (plan?.exercises || []).map((exercise, index) => ({ ...exercise, completed: status === 'completed' || Boolean(doneExercises[index]) }));
    try {
      const { data } = await api.post('/workout/log', {
        status,
        actual_km: Number(actualKm),
        duration_min: Number(duration),
        planned_km: plan?.run_km,
        reason,
        exercises,
      });
      setLog(data.log);
      setPlan(data.tomorrow_plan);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <header><h1>Workout</h1><p>Run first. Total window is 60 minutes.</p></header>
      <WorkoutPlanCard plan={plan} />

      <section className="card screen tight">
        <h2>Log Workout</h2>
        <div className="scroll-row">
          {['completed', 'partial', 'skipped'].map((item) => <button key={item} className={`chip ${status === item ? 'active' : ''}`} onClick={() => setStatus(item)}>{item}</button>)}
        </div>
        {status !== 'skipped' && (
          <>
            <input className="input" type="number" min="0" max="20" value={actualKm} onChange={(event) => setActualKm(event.target.value)} placeholder="Actual km run" />
            <input className="input" type="number" min="0" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="Duration minutes" />
            <div className="screen tight">
              {(plan?.exercises || []).map((exercise, index) => (
                <label className="between" key={`${exercise.name}-${index}`}>
                  <span>{exercise.name}</span>
                  <input type="checkbox" checked={status === 'completed' || Boolean(doneExercises[index])} disabled={status === 'completed'} onChange={() => toggle(index)} />
                </label>
              ))}
            </div>
          </>
        )}
        {status !== 'completed' && <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason. Be honest." />}
        <button className="button" disabled={busy} onClick={submit}>{busy ? 'Submitting...' : 'Submit Workout'}</button>
      </section>

      {(log?.workout?.status || stepsCountFromLog(log) > 0) && (
        <section className="card">
          <p className="label">Today</p>
          {log?.workout?.status && <h2>{log.workout.status}</h2>}
          <p>
            Total burned {activityBurnedFromLog(log)} kcal
            {stepsBurnedFromLog(log) > 0 && ` (workout ${workoutBurnedFromLog(log)} + steps ${stepsBurnedFromLog(log)})`}.
            {log?.workout?.run?.actual_km != null && <> Run {log.workout.run.actual_km} km.</>}
          </p>
          {stepsCountFromLog(log) > 0 && (
            <p className="small">Steps: {stepsCountFromLog(log).toLocaleString('en-IN')} - walking {stepsBurnedFromLog(log)} kcal</p>
          )}
          {log?.ai_daily_summary && <p className="accent">{log.ai_daily_summary}</p>}
        </section>
      )}
    </main>
  );
}
