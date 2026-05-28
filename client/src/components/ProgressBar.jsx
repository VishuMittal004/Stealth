export default function ProgressBar({ value = 0, max = 100, danger = false }) {
  const pct = Math.max(0, Math.min(100, max ? (Number(value) / Number(max)) * 100 : 0));
  return (
    <div className="progress-track" aria-label={`${Math.round(pct)} percent`}>
      <div className={`progress-fill ${danger ? 'danger' : ''}`} style={{ '--value': `${pct}%` }} />
    </div>
  );
}
