import { Bot, Dumbbell, Home, LineChart, Utensils } from 'lucide-react';

const tabs = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'diet', label: 'Diet', Icon: Utensils },
  { id: 'workout', label: 'Workout', Icon: Dumbbell },
  { id: 'progress', label: 'Progress', Icon: LineChart },
  { id: 'coach', label: 'Coach', Icon: Bot },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onChange(id)} title={label}>
          <Icon size={21} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
