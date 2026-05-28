export default function WorkoutPlanCard({ plan }) {
  if (!plan) return <div className="card"><p>No workout plan generated yet.</p></div>;
  return (
    <div className="card screen tight">
      <div className="between">
        <h3>Assigned Plan</h3>
        <span className="mono accent">{plan.estimated_total_time_min || 60} min</span>
      </div>
      <p>Run: <span className="accent mono">{plan.run_km} km</span> in about <span className="mono">{plan.run_duration_min} min</span></p>
      <div className="screen tight">
        {(plan.exercises || []).map((exercise, index) => (
          <div className="between" key={`${exercise.name}-${index}`}>
            <div>
              <p className="accent">{exercise.name}</p>
              <p className="small">{exercise.focus || 'Full Body'}</p>
            </div>
            <span className="mono small">
              {exercise.sets ? `${exercise.sets} x ${exercise.reps || `${exercise.duration_sec}s`}` : `${exercise.duration_sec}s`}
            </span>
          </div>
        ))}
      </div>
      <p className="small">Estimated burn: {Math.round(plan.estimated_calories_burned || 0)} kcal</p>
      {plan.coach_message && <p className="accent">{plan.coach_message}</p>}
    </div>
  );
}
