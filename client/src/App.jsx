import { useState } from 'react';
import BottomNav from './components/BottomNav';
import Coach from './pages/Coach';
import Dashboard from './pages/Dashboard';
import DietLog from './pages/DietLog';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Progress from './pages/Progress';
import Workout from './pages/Workout';
import { useProfile } from './hooks/useProfile';

export default function App() {
  const { profile, status, error, reload } = useProfile();
  const [tab, setTab] = useState('home');

  if (status === 'loading') return <main className="app-shell"><div className="card"><p>Loading app...</p></div></main>;
  if (status === 'needs_setup') return <Onboarding onDone={reload} />;
  if (status === 'locked') return <Login onUnlock={reload} />;
  if (status === 'error') return <main className="app-shell"><div className="card"><p className="danger">{error}</p></div></main>;

  const page = {
    home: <Dashboard profile={profile} go={setTab} reloadProfile={reload} />,
    diet: <DietLog profile={profile} />,
    workout: <Workout profile={profile} />,
    progress: <Progress profile={profile} reloadProfile={reload} />,
    coach: <Coach profile={profile} />,
  }[tab];

  return (
    <div className="app-shell">
      {page}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
