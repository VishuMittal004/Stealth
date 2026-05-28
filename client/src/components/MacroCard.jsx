import ProgressBar from './ProgressBar';

export default function MacroCard({ label, value = 0, target = 0 }) {
  return (
    <div className="card tight">
      <div className="between">
        <span className="label">{label}</span>
        <span className="mono small">{Math.round(value)} / {Math.round(target)}g</span>
      </div>
      <ProgressBar value={value} max={target || 1} danger={value > target && target > 0} />
    </div>
  );
}
