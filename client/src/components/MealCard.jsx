import { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function MealCard({ meal, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="meal-row" onDoubleClick={onDelete}>
      <div className="between" onClick={() => setOpen(!open)}>
        <div>
          <p className="label">{meal.meal_type}</p>
          <h3>{meal.description}</h3>
        </div>
        <div className="row">
          <span className="mono accent">{Math.round(meal.calories)} kcal</span>
          <button className="button ghost" style={{ minHeight: 34, padding: '0 8px' }} onClick={(event) => { event.stopPropagation(); onDelete(); }} title="Delete meal">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {open && (
        <div className="grid-2" style={{ marginTop: 12 }}>
          <p className="small">Protein {Math.round(meal.protein_g)}g</p>
          <p className="small">Carbs {Math.round(meal.carbs_g)}g</p>
          <p className="small">Fats {Math.round(meal.fats_g)}g</p>
          <p className="small">Fiber {Math.round(meal.fiber_g)}g</p>
          <p className="small">Sugar {Math.round(meal.sugar_g)}g</p>
          <p className="small">Sodium {Math.round(meal.sodium_mg)}mg</p>
        </div>
      )}
    </div>
  );
}
