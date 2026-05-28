import { useEffect, useState } from 'react';
import api, { activityBurnedFromLog, totalsFromMeals } from '../api/client';
import MealCard from '../components/MealCard';

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function DietLog({ profile }) {
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [analysis, setAnalysis] = useState(null);
  const [warning, setWarning] = useState('');
  const [log, setLog] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [busy, setBusy] = useState(false);
  const totals = totalsFromMeals(log || {});

  async function load() {
    const [{ data: mealsData }, { data: suggestionData }] = await Promise.all([
      api.get('/meals/today'),
      api.get('/meals/suggestions'),
    ]);
    setLog(mealsData.log);
    setSuggestions(suggestionData.options || []);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function analyse() {
    setBusy(true);
    setWarning('');
    try {
      const { data } = await api.post('/meals/analyse', { description, meal_type: mealType });
      setAnalysis({ ...data.analysis, description, meal_type: mealType });
      setWarning(data.warning || '');
    } finally {
      setBusy(false);
    }
  }

  async function saveMeal() {
    const { data } = await api.post('/meals/save', { meal: analysis });
    setLog(data.log);
    setDescription('');
    setAnalysis(null);
    setWarning('');
    load().catch(() => {});
  }

  async function deleteMeal(id) {
    const { data } = await api.delete(`/meals/${id}`);
    setLog(data.log);
  }

  return (
    <main className="screen">
      <header><h1>Diet Log</h1><p>Indian food only. Log it exactly as eaten.</p></header>

      <section className="card screen tight">
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. teen roti, ek bowl dal tadka, thoda chawal aur ek glass lassi" />
        <div className="scroll-row">
          {mealTypes.map((type) => <button key={type} className={`chip ${mealType === type ? 'active' : ''}`} onClick={() => setMealType(type)}>{type}</button>)}
        </div>
        <button className="button" disabled={!description.trim() || busy} onClick={analyse}>{busy ? 'Analysing...' : 'Analyse'}</button>
      </section>

      {warning && <div className="card"><p className="danger">{warning}</p></div>}

      {analysis && (
        <section className="card screen tight">
          <div className="between"><h3>Breakdown</h3><span className="mono accent">{Math.round(analysis.calories)} kcal</span></div>
          <div className="grid-2">
            <p>Protein {Math.round(analysis.protein_g)}g</p>
            <p>Carbs {Math.round(analysis.carbs_g)}g</p>
            <p>Fats {Math.round(analysis.fats_g)}g</p>
            <p>Fiber {Math.round(analysis.fiber_g)}g</p>
            <p>Sodium {Math.round(analysis.sodium_mg)}mg</p>
            <p>Sugar {Math.round(analysis.sugar_g)}g</p>
          </div>
          <p className="accent">{analysis.ai_analysis}</p>
          <button className="button" onClick={saveMeal}>Confirm & Save</button>
        </section>
      )}

      <section className="card screen tight">
        <div className="between"><h2>What should I eat next?</h2></div>
        {suggestions.map((item) => (
          <div key={item.name}>
            <h3>{item.name}</h3>
            <p>{item.calories} kcal, {item.protein_g}g protein. {item.reason}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="between"><h2>Today's Meals</h2><span className="mono accent">{Math.round(totals.calories)} kcal</span></div>
        {[...(log?.meals || [])].reverse().map((meal) => <MealCard key={meal._id} meal={meal} onDelete={() => deleteMeal(meal._id)} />)}
        {!log?.meals?.length && <p>No meals logged today.</p>}
      </section>

      <div className="card sticky-totals">
        <p className="mono small">
          Calories: {Math.round(totals.calories)} / {profile.daily_calorie_target}
          {log && <> | Net {Math.round(totals.calories - activityBurnedFromLog(log))} kcal (burned {activityBurnedFromLog(log)})</>}
          {' '}| Protein: {Math.round(totals.protein_g)}g | Carbs: {Math.round(totals.carbs_g)}g | Fats: {Math.round(totals.fats_g)}g
        </p>
      </div>
    </main>
  );
}
