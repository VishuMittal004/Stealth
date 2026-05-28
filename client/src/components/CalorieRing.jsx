export default function CalorieRing({ consumed = 0, burned = 0, target = 1, workoutBurned = 0, stepsBurned = 0 }) {
  const net = Math.round(consumed - burned);
  const pct = Math.max(0, Math.min(100, (consumed / Math.max(1, target)) * 100));
  const over = net > target;
  const showSplit = stepsBurned > 0;
  return (
    <div className="calorie-meter" style={{ '--meter-value': `${pct}%`, '--meter-color': over ? '#FF3B3B' : '#D8FF1D' }}>
      <div className="calorie-meter-inner">
        <div>
          <div className={`number ${over ? 'danger' : 'accent'}`} style={{ fontSize: 34 }}>{Math.round(consumed)}</div>
          <p className="small">of {Math.round(target)} kcal consumed</p>
          <p className="small">Burned {Math.round(burned)} kcal</p>
          {showSplit && (
            <p className="small muted">Workout {Math.round(workoutBurned)} + Steps {Math.round(stepsBurned)} kcal</p>
          )}
          <h3 className={over ? 'danger' : 'accent'}>Net {net} kcal</h3>
        </div>
      </div>
    </div>
  );
}
