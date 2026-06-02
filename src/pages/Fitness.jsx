import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getLast30Days, formatDateShort } from '../utils/dates';
import { format, subDays } from 'date-fns';
import {
  Dumbbell, Scale, Flame, Droplets, Footprints, Target,
  Plus, Trash2, Edit3, Check, X, ChevronUp, ChevronDown,
  Play, CheckCircle2, Apple, Coffee, UtensilsCrossed, Cookie,
  TrendingUp, TrendingDown, Award, Activity, Percent, Ruler,
  GlassWater, Zap, BarChart3, ArrowRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';

const TABS = ['Today', 'Workouts', 'Nutrition', 'Progress'];

const pageAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};

const cardAnim = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
});

// ─── Progress Ring SVG ────────────────────────────────────────────────────
function ProgressRing({ value, max, size = 80, stroke = 6, color = 'var(--accent-primary)', children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / (max || 1), 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--bg-tertiary)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, unit, goal, color, onUpdate, index }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const pct = goal ? Math.round((value / goal) * 100) : null;

  const handleSave = () => {
    const num = parseFloat(editVal);
    if (!isNaN(num) && num >= 0) onUpdate(num);
    setEditing(false);
  };

  return (
    <motion.div className="card" {...cardAnim(index)}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: color ? color.replace(')', ', 0.15)').replace('rgb', 'rgba') : 'var(--accent-primary-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={16} style={{ color: color || 'var(--accent-primary)' }} />
          </div>
          <span className="stat-label" style={{ marginBottom: 0 }}>{label}</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditVal(String(value || 0)); setEditing(true); }}
          style={{ opacity: 0.5, padding: 4 }}>
          <Edit3 size={13} />
        </button>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <input className="input" type="number" autoFocus value={editVal}
            onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{ flex: 1, fontFamily: 'var(--font-mono)' }} />
          <button className="btn btn-primary btn-sm" onClick={handleSave}><Check size={14} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}><X size={14} /></button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span className="stat-value" style={{ color: color || 'var(--text-primary)' }}>{value || 0}</span>
          <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{unit}</span>
          {goal && <span className="text-muted" style={{ fontSize: 'var(--fs-xs)', marginLeft: 'auto' }}>/ {goal}</span>}
        </div>
      )}

      {goal && (
        <div>
          <div className="progress-bar" style={{ height: 5 }}>
            <div className="progress-bar-fill" style={{
              width: `${Math.min(pct, 100)}%`,
              background: pct >= 100 ? 'var(--accent-success)' : color || undefined
            }} />
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)', textAlign: 'right' }}>
            {pct}%
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Workout Modal ────────────────────────────────────────────────────────
function WorkoutModal({ workout, onClose, onSave }) {
  const [name, setName] = useState(workout?.name || '');
  const [exercises, setExercises] = useState(workout?.exercises || []);

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10, weight: 0 }]);
  };

  const updateExercise = (i, field, val) => {
    const copy = [...exercises];
    copy[i] = { ...copy[i], [field]: field === 'name' ? val : (parseFloat(val) || 0) };
    setExercises(copy);
  };

  const removeExercise = (i) => setExercises(exercises.filter((_, idx) => idx !== i));

  const moveExercise = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= exercises.length) return;
    const copy = [...exercises];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setExercises(copy);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), exercises });
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{workout ? 'Edit Workout' : 'New Workout'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label className="input-label">Workout Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Push Day" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="input-label" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Exercises</span>
            <button className="btn btn-secondary btn-sm" onClick={addExercise}>
              <Plus size={14} /> Add
            </button>
          </div>

          <div className="flex-col gap-2" style={{ maxHeight: 340, overflowY: 'auto' }}>
            {exercises.map((ex, i) => (
              <div key={i} className="card" style={{
                padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <input className="input" placeholder="Exercise name" value={ex.name}
                    onChange={e => updateExercise(i, 'name', e.target.value)} style={{ flex: 1 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button className="btn btn-ghost" onClick={() => moveExercise(i, -1)}
                      style={{ padding: 2 }}><ChevronUp size={13} /></button>
                    <button className="btn btn-ghost" onClick={() => moveExercise(i, 1)}
                      style={{ padding: 2 }}><ChevronDown size={13} /></button>
                  </div>
                  <button className="btn btn-ghost" onClick={() => removeExercise(i)}
                    style={{ padding: 4, color: 'var(--accent-danger)' }}><Trash2 size={14} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                  <div className="input-group" style={{ gap: 2 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Sets</span>
                    <input className="input" type="number" value={ex.sets}
                      onChange={e => updateExercise(i, 'sets', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="input-group" style={{ gap: 2 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Reps</span>
                    <input className="input" type="number" value={ex.reps}
                      onChange={e => updateExercise(i, 'reps', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="input-group" style={{ gap: 2 }}>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Kg</span>
                    <input className="input" type="number" value={ex.weight}
                      onChange={e => updateExercise(i, 'weight', e.target.value)} style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
              </div>
            ))}
            {exercises.length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <Dumbbell className="empty-state-icon" />
                <p className="text-muted">Add exercises to this workout</p>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={16} /> {workout ? 'Update' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Meal Modal ───────────────────────────────────────────────────────────
function MealModal({ onClose, onSave, mealType }) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');

  const quickMeals = [
    { name: 'Eggs (2)', cal: 155, pro: 12 },
    { name: 'Oatmeal', cal: 300, pro: 10 },
    { name: 'Chicken Breast', cal: 280, pro: 50 },
    { name: 'Rice Bowl', cal: 350, pro: 8 },
    { name: 'Protein Shake', cal: 200, pro: 30 },
    { name: 'Salad', cal: 180, pro: 6 },
    { name: 'Banana', cal: 105, pro: 1 },
    { name: 'Greek Yogurt', cal: 130, pro: 15 },
    { name: 'Paneer Tikka', cal: 320, pro: 22 },
    { name: 'Dal + Roti', cal: 380, pro: 16 },
    { name: 'Whey Scoop', cal: 120, pro: 25 },
    { name: 'Almonds (30g)', cal: 170, pro: 6 },
  ];

  const handleQuick = (m) => {
    setName(m.name);
    setCalories(String(m.cal));
    setProtein(String(m.pro));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), calories: parseInt(calories) || 0, protein: parseInt(protein) || 0, type: mealType });
    onClose();
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}>
        <div className="modal-header">
          <h2>Add {mealType}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div>
            <span className="input-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>Quick Add</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {quickMeals.map(m => (
                <button key={m.name} className="btn btn-secondary btn-sm" onClick={() => handleQuick(m)}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Food Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken Rice" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="input-group">
              <label className="input-label">Calories</label>
              <input className="input" type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="kcal"
                style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="input-group">
              <label className="input-label">Protein (g)</label>
              <input className="input" type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="grams"
                style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}><Plus size={16} /> Add Meal</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', boxShadow: 'var(--shadow-lg)'
    }}>
      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 'var(--fs-sm)', color: p.color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  Main Fitness Component
// ═══════════════════════════════════════════════════════════════════════════
export default function Fitness() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Today');
  const [workoutModal, setWorkoutModal] = useState(null);    // null | 'new' | workoutObj
  const [mealModal, setMealModal] = useState(null);          // null | 'Breakfast' | 'Lunch' | etc.

  const today = todayStr();
  const last30 = useMemo(() => getLast30Days(), []);

  // ── State ──────────────────────────────────────────────────────────────
  const [todayLog, setTodayLog] = useState(null);
  const [settings, setSettings] = useState({});
  const [workouts, setWorkouts] = useState([]);
  const [dietPlan, setDietPlan] = useState(null);
  const [fitnessHistory, setFitnessHistory] = useState({});

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, today, last30]);

  async function fetchData() {
    if (!currentUser) return;
    
    // todayLog
    const { data: logData } = await supabase.from('fitness').select('*').eq('user_id', currentUser.id).eq('date', today).maybeSingle();
    setTodayLog(logData || null);

    // settings
    const { data: settingsData } = await supabase.from('settings').select('*').eq('user_id', currentUser.id);
    if (settingsData) {
      const map = {};
      settingsData.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
    }

    // workouts
    const { data: workoutsData } = await supabase.from('workouts').select('*').eq('user_id', currentUser.id).order('order');
    if (workoutsData) setWorkouts(workoutsData);

    // dietPlan
    const { data: dietData } = await supabase.from('dietPlans').select('*').eq('user_id', currentUser.id).eq('isActive', 1).maybeSingle();
    setDietPlan(dietData || null);

    // fitnessHistory
    const { data: historyData } = await supabase.from('fitness').select('*').eq('user_id', currentUser.id).in('date', last30);
    if (historyData) {
      const map = {};
      historyData.forEach(d => { map[d.date] = d; });
      setFitnessHistory(map);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  const goals = useMemo(() => ({
    calories: settings?.calorieGoal || 2200,
    protein: settings?.proteinGoal || 150,
    water: settings?.waterGoal || 3000,
    steps: settings?.stepGoal || 10000,
    weight: settings?.weightGoal || 70,
  }), [settings]);

  const ensureTodayLog = useCallback(async () => {
    if (!currentUser) return null;
    let { data: existing } = await supabase.from('fitness').select('*').eq('user_id', currentUser.id).eq('date', today).maybeSingle();
    if (existing) return existing;
    
    const newLog = {
      user_id: currentUser.id,
      date: today, weight: 0, bodyFat: 0, waist: 0,
      calories: 0, protein: 0, water: 0, steps: 0,
      gymCompleted: false, meals: []
    };
    const { data } = await supabase.from('fitness').insert([newLog]).select().single();
    return data;
  }, [today, currentUser]);

  const updateField = useCallback(async (field, value) => {
    const log = await ensureTodayLog();
    if (!log) return;
    await supabase.from('fitness').update({ [field]: value }).eq('id', log.id);
    fetchData();
  }, [ensureTodayLog]);

  // ── Workout CRUD ───────────────────────────────────────────────────────
  const saveWorkout = useCallback(async (data) => {
    if (!currentUser) return;
    if (workoutModal && workoutModal.id) {
      await supabase.from('workouts').update(data).eq('id', workoutModal.id);
    } else {
      const count = workouts.length;
      await supabase.from('workouts').insert([{ ...data, user_id: currentUser.id, isActive: 0, order: count }]);
    }
    setWorkoutModal(null);
    fetchData();
  }, [workoutModal, workouts, currentUser]);

  const deleteWorkout = useCallback(async (id) => {
    if (!currentUser) return;
    await supabase.from('workouts').delete().eq('id', id);
    fetchData();
  }, [currentUser]);

  const toggleWorkoutActive = useCallback(async (id, current) => {
    if (!currentUser) return;
    await supabase.from('workouts').update({ isActive: current ? 0 : 1 }).eq('id', id);
    fetchData();
  }, [currentUser]);

  // ── Meal Logging ───────────────────────────────────────────────────────
  const addMeal = useCallback(async (meal) => {
    const current = await ensureTodayLog();
    if (!current) return;
    const meals = current.meals || [];
    meals.push(meal);
    const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
    const totalPro = meals.reduce((s, m) => s + (m.protein || 0), 0);
    await supabase.from('fitness').update({ meals, calories: totalCal, protein: totalPro }).eq('id', current.id);
    fetchData();
  }, [ensureTodayLog]);

  const removeMeal = useCallback(async (index) => {
    const current = await ensureTodayLog();
    if (!current) return;
    const meals = (current.meals || []).filter((_, i) => i !== index);
    const totalCal = meals.reduce((s, m) => s + (m.calories || 0), 0);
    const totalPro = meals.reduce((s, m) => s + (m.protein || 0), 0);
    await supabase.from('fitness').update({ meals, calories: totalCal, protein: totalPro }).eq('id', current.id);
    fetchData();
  }, [ensureTodayLog]);

  // ── Progress Data ──────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!fitnessHistory) return [];
    return last30.map(date => ({
      date: formatDateShort(date),
      weight: fitnessHistory[date]?.weight || null,
      bodyFat: fitnessHistory[date]?.bodyFat || null,
    })).filter(d => d.weight || d.bodyFat);
  }, [fitnessHistory, last30]);

  const progressStats = useMemo(() => {
    if (!fitnessHistory) return {};
    const entries = last30.map(d => fitnessHistory[d]).filter(Boolean).filter(e => e.weight > 0);
    if (entries.length === 0) return {};
    const weights = entries.map(e => e.weight);
    return {
      current: weights[weights.length - 1],
      best: Math.min(...weights),
      highest: Math.max(...weights),
      first: weights[0],
      change: (weights[weights.length - 1] - weights[0]).toFixed(1),
      avg: (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1),
    };
  }, [fitnessHistory, last30]);

  // ── Daily completion % ─────────────────────────────────────────────────
  const dailyCompletion = useMemo(() => {
    if (!todayLog) return 0;
    let count = 0;
    let total = 4;
    if (todayLog.calories >= goals.calories) count++;
    if (todayLog.protein >= goals.protein) count++;
    if (todayLog.water >= goals.water) count++;
    if (todayLog.steps >= goals.steps) count++;
    if (todayLog.gymCompleted) { count++; total++; }
    else total++;
    return Math.round((count / total) * 100);
  }, [todayLog, goals]);

  // ── Render ─────────────────────────────────────────────────────────────
  const log = todayLog || {};
  const meals = log.meals || [];
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

  return (
    <motion.div className="page-container" {...pageAnim}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Dumbbell size={24} style={{ color: 'var(--accent-primary)' }} />
              Fitness
            </h1>
            <p>Track your body, fuel, and workouts</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <ProgressRing value={dailyCompletion} max={100} size={56} stroke={5}
              color={dailyCompletion >= 80 ? 'var(--accent-success)' : 'var(--accent-primary)'}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--fs-sm)' }}>
                {dailyCompletion}%
              </span>
            </ProgressRing>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {TABS.map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ─── TODAY TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'Today' && (
          <motion.div key="today" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}>

            {/* Body Metrics — gradient cards */}
            <div className="section-title" style={{ marginTop: 0 }}>Body Metrics</div>
            <div className="grid-3 mb-6">
              <motion.div className="card-gradient" {...cardAnim(0)} style={{
                '--accent-gradient': 'linear-gradient(135deg, #7C6BF0, #00D4FF)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <Scale size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span className="stat-label" style={{ marginBottom: 0 }}>Weight</span>
                </div>
                <InlineEditable value={log.weight} unit="kg" onSave={v => updateField('weight', v)} />
                {goals.weight > 0 && (
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                    Goal: {goals.weight} kg
                    {log.weight > 0 && <span style={{ marginLeft: 'var(--space-2)', color: log.weight <= goals.weight ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                      ({log.weight <= goals.weight ? '✓' : `${(log.weight - goals.weight).toFixed(1)} kg to go`})
                    </span>}
                  </div>
                )}
              </motion.div>

              <motion.div className="card-gradient" {...cardAnim(1)} style={{
                '--accent-gradient': 'linear-gradient(135deg, #F472B6, #FBBF24)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <Percent size={16} style={{ color: 'var(--accent-pink)' }} />
                  <span className="stat-label" style={{ marginBottom: 0 }}>Body Fat</span>
                </div>
                <InlineEditable value={log.bodyFat} unit="%" onSave={v => updateField('bodyFat', v)} />
              </motion.div>

              <motion.div className="card-gradient" {...cardAnim(2)} style={{
                '--accent-gradient': 'linear-gradient(135deg, #34D399, #00D4FF)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <Ruler size={16} style={{ color: 'var(--accent-success)' }} />
                  <span className="stat-label" style={{ marginBottom: 0 }}>Waist</span>
                </div>
                <InlineEditable value={log.waist} unit="cm" onSave={v => updateField('waist', v)} />
              </motion.div>
            </div>

            {/* Daily Trackers */}
            <div className="section-title">Daily Trackers</div>
            <div className="grid-2 mb-6">
              <MetricCard icon={Flame} label="Calories" value={log.calories} unit="kcal"
                goal={goals.calories} color="var(--accent-orange)" index={0}
                onUpdate={v => updateField('calories', v)} />
              <MetricCard icon={Zap} label="Protein" value={log.protein} unit="g"
                goal={goals.protein} color="var(--accent-secondary)" index={1}
                onUpdate={v => updateField('protein', v)} />
              <MetricCard icon={GlassWater} label="Water" value={log.water} unit="ml"
                goal={goals.water} color="var(--accent-primary)" index={2}
                onUpdate={v => updateField('water', v)} />
              <MetricCard icon={Footprints} label="Steps" value={log.steps} unit="steps"
                goal={goals.steps} color="var(--accent-success)" index={3}
                onUpdate={v => updateField('steps', v)} />
            </div>

            {/* Water glasses visual */}
            <motion.div className="card mb-6" {...cardAnim(4)}>
              <div className="flex-between mb-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Droplets size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span className="stat-label" style={{ marginBottom: 0 }}>Water Glasses</span>
                </div>
                <span className="text-mono text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                  {Math.floor((log.water || 0) / 250)} / {Math.ceil(goals.water / 250)} glasses
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {Array.from({ length: Math.ceil(goals.water / 250) }, (_, i) => {
                  const filled = i < Math.floor((log.water || 0) / 250);
                  return (
                    <button key={i} onClick={async () => {
                      const newVal = filled ? i * 250 : (i + 1) * 250;
                      await updateField('water', newVal);
                    }}
                      style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor: filled ? 'var(--accent-primary)' : 'var(--glass-border)',
                        background: filled ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all var(--transition-fast)'
                      }}>
                      <GlassWater size={16} style={{ color: filled ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Gym Toggle */}
            <motion.div className="card" {...cardAnim(5)}>
              <div className="flex-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: log.gymCompleted ? 'var(--accent-success-dim)' : 'var(--bg-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all var(--transition-base)'
                  }}>
                    <Dumbbell size={20} style={{ color: log.gymCompleted ? 'var(--accent-success)' : 'var(--text-tertiary)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'var(--fw-semibold)' }}>Gym Session</div>
                    <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                      {log.gymCompleted ? 'Completed! 💪' : 'Not yet completed'}
                    </div>
                  </div>
                </div>
                <div className={`toggle ${log.gymCompleted ? 'active' : ''}`}
                  onClick={() => updateField('gymCompleted', !log.gymCompleted)} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── WORKOUTS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'Workouts' && (
          <motion.div key="workouts" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}>

            <div className="flex-between mb-4">
              <span className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>My Routines</span>
              <button className="btn btn-primary btn-sm" onClick={() => setWorkoutModal('new')}>
                <Plus size={16} /> New Workout
              </button>
            </div>

            <div className="flex-col gap-4">
              {workouts && workouts.length > 0 ? workouts.map((w, i) => (
                <motion.div key={w.id} className="card" {...cardAnim(i)}
                  style={{ border: w.isActive ? '1px solid rgba(52,211,153,0.3)' : undefined }}>
                  <div className="flex-between mb-4">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <h3 style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-md)' }}>{w.name}</h3>
                        {w.isActive ? <span className="badge badge-green">Active</span> : null}
                      </div>
                      <span className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                        {(w.exercises || []).length} exercises
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setWorkoutModal(w)}>
                        <Edit3 size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => toggleWorkoutActive(w.id, w.isActive)}
                        style={{ color: w.isActive ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                        {w.isActive ? <CheckCircle2 size={16} /> : <Play size={16} />}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteWorkout(w.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Exercise list */}
                  {(w.exercises || []).length > 0 && (
                    <div style={{
                      display: 'grid', gap: 'var(--space-2)',
                      background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)'
                    }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
                        gap: 'var(--space-2)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)',
                        fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em',
                        paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--glass-border)'
                      }}>
                        <span>Exercise</span>
                        <span style={{ textAlign: 'center' }}>Sets</span>
                        <span style={{ textAlign: 'center' }}>Reps</span>
                        <span style={{ textAlign: 'center' }}>Kg</span>
                      </div>
                      {(w.exercises || []).map((ex, j) => (
                        <div key={j} style={{
                          display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px',
                          gap: 'var(--space-2)', fontSize: 'var(--fs-sm)', alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 'var(--fw-medium)' }}>{ex.name || '—'}</span>
                          <span className="text-mono" style={{ textAlign: 'center', color: 'var(--accent-secondary)' }}>{ex.sets}</span>
                          <span className="text-mono" style={{ textAlign: 'center' }}>{ex.reps}</span>
                          <span className="text-mono" style={{ textAlign: 'center', color: 'var(--accent-warning)' }}>{ex.weight}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )) : (
                <div className="empty-state">
                  <Dumbbell className="empty-state-icon" />
                  <h3>No Workouts Yet</h3>
                  <p className="text-muted">Create your first workout routine to get started</p>
                  <button className="btn btn-primary mt-4" onClick={() => setWorkoutModal('new')}>
                    <Plus size={16} /> Create Workout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── NUTRITION TAB ─────────────────────────────────────────────── */}
        {activeTab === 'Nutrition' && (
          <motion.div key="nutrition" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}>

            {/* Daily summary cards */}
            <div className="grid-2 mb-6">
              <motion.div className="card-gradient" {...cardAnim(0)}>
                <div className="flex-between mb-2">
                  <span className="stat-label" style={{ marginBottom: 0 }}>Calories</span>
                  <Flame size={16} style={{ color: 'var(--accent-orange)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                  <span className="stat-value">{log.calories || 0}</span>
                  <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>/ {goals.calories} kcal</span>
                </div>
                <div className="progress-bar mt-2" style={{ height: 5 }}>
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(((log.calories || 0) / goals.calories) * 100, 100)}%`,
                    background: 'var(--accent-orange)'
                  }} />
                </div>
              </motion.div>

              <motion.div className="card-gradient" {...cardAnim(1)}>
                <div className="flex-between mb-2">
                  <span className="stat-label" style={{ marginBottom: 0 }}>Protein</span>
                  <Zap size={16} style={{ color: 'var(--accent-secondary)' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                  <span className="stat-value">{log.protein || 0}</span>
                  <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>/ {goals.protein} g</span>
                </div>
                <div className="progress-bar mt-2" style={{ height: 5 }}>
                  <div className="progress-bar-fill" style={{
                    width: `${Math.min(((log.protein || 0) / goals.protein) * 100, 100)}%`,
                    background: 'var(--accent-secondary)'
                  }} />
                </div>
              </motion.div>
            </div>

            {/* Meal sections */}
            {mealTypes.map((type, ti) => {
              const typeMeals = meals.filter(m => m.type === type);
              const typeIcon = type === 'Breakfast' ? Coffee : type === 'Lunch' ? UtensilsCrossed : type === 'Dinner' ? Apple : Cookie;
              const TypeIcon = typeIcon;
              return (
                <div key={type} className="mb-6">
                  <div className="flex-between mb-2">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <TypeIcon size={16} style={{ color: 'var(--accent-primary)' }} />
                      <span className="section-title" style={{ margin: 0 }}>{type}</span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setMealModal(type)}>
                      <Plus size={13} /> Add
                    </button>
                  </div>
                  {typeMeals.length > 0 ? (
                    <div className="flex-col gap-2">
                      {typeMeals.map((meal, mi) => {
                        const globalIdx = meals.indexOf(meal);
                        return (
                          <motion.div key={mi} className="card" {...cardAnim(mi)}
                            style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-base)' }}>{meal.name}</div>
                              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-1)' }}>
                                <span className="text-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent-orange)' }}>
                                  {meal.calories} kcal
                                </span>
                                <span className="text-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--accent-secondary)' }}>
                                  {meal.protein}g protein
                                </span>
                              </div>
                            </div>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => removeMeal(globalIdx)}
                              style={{ color: 'var(--accent-danger)', opacity: 0.6 }}>
                              <Trash2 size={14} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>
                      No meals logged
                    </div>
                  )}
                </div>
              );
            })}

            {/* Daily totals */}
            <motion.div className="card-glow" {...cardAnim(4)}>
              <div className="section-title" style={{ margin: 0, marginBottom: 'var(--space-3)' }}>Daily Totals</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div>
                  <div className="stat-label">Total Calories</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                    <span className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>{log.calories || 0}</span>
                    <span className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>/ {goals.calories}</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: (log.calories || 0) >= goals.calories ? 'var(--accent-success)' : 'var(--accent-warning)', marginTop: 'var(--space-1)' }}>
                    {(log.calories || 0) >= goals.calories ? '✓ Target reached' : `${goals.calories - (log.calories || 0)} remaining`}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Total Protein</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                    <span className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>{log.protein || 0}</span>
                    <span className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>/ {goals.protein}g</span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: (log.protein || 0) >= goals.protein ? 'var(--accent-success)' : 'var(--accent-warning)', marginTop: 'var(--space-1)' }}>
                    {(log.protein || 0) >= goals.protein ? '✓ Target reached' : `${goals.protein - (log.protein || 0)}g remaining`}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── PROGRESS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'Progress' && (
          <motion.div key="progress" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}>

            {/* Summary cards */}
            <div className="grid-4 mb-6">
              <motion.div className="card-gradient" {...cardAnim(0)}>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Scale size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span className="stat-label" style={{ marginBottom: 0 }}>Current</span>
                  </div>
                  <span className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>
                    {progressStats.current || '—'}
                    <span className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 400, marginLeft: 4 }}>kg</span>
                  </span>
                </div>
              </motion.div>

              <motion.div className="card-gradient" {...cardAnim(1)} style={{ '--accent-gradient': 'linear-gradient(135deg, #34D399, #00D4FF)' }}>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Award size={14} style={{ color: 'var(--accent-success)' }} />
                    <span className="stat-label" style={{ marginBottom: 0 }}>Best</span>
                  </div>
                  <span className="stat-value" style={{ fontSize: 'var(--fs-lg)', color: 'var(--accent-success)' }}>
                    {progressStats.best || '—'}
                    <span className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 400, marginLeft: 4 }}>kg</span>
                  </span>
                </div>
              </motion.div>

              <motion.div className="card-gradient" {...cardAnim(2)} style={{ '--accent-gradient': 'linear-gradient(135deg, #F472B6, #FBBF24)' }}>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Target size={14} style={{ color: 'var(--accent-pink)' }} />
                    <span className="stat-label" style={{ marginBottom: 0 }}>Goal</span>
                  </div>
                  <span className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>
                    {goals.weight}
                    <span className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 400, marginLeft: 4 }}>kg</span>
                  </span>
                </div>
              </motion.div>

              <motion.div className="card" {...cardAnim(3)}>
                <div className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {parseFloat(progressStats.change) < 0
                      ? <TrendingDown size={14} style={{ color: 'var(--accent-success)' }} />
                      : <TrendingUp size={14} style={{ color: 'var(--accent-danger)' }} />}
                    <span className="stat-label" style={{ marginBottom: 0 }}>30d Change</span>
                  </div>
                  <span className={`stat-value ${parseFloat(progressStats.change) <= 0 ? '' : ''}`}
                    style={{
                      fontSize: 'var(--fs-lg)',
                      color: parseFloat(progressStats.change) <= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                    }}>
                    {progressStats.change ? `${progressStats.change > 0 ? '+' : ''}${progressStats.change}` : '—'}
                    <span className="text-muted" style={{ fontSize: 'var(--fs-xs)', fontWeight: 400, marginLeft: 4 }}>kg</span>
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Weight Chart */}
            <motion.div className="card mb-6" {...cardAnim(4)}>
              <div className="flex-between mb-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Activity size={16} style={{ color: 'var(--accent-primary)' }} />
                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>Weight Trend</h3>
                </div>
                <span className="badge badge-purple">Last 30 days</span>
              </div>
              {chartData.length > 2 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7C6BF0" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#7C6BF0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="weight" stroke="#7C6BF0" strokeWidth={2}
                      fill="url(#weightGrad)" name="Weight (kg)" dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <BarChart3 className="empty-state-icon" />
                  <h3>Not Enough Data</h3>
                  <p className="text-muted">Log your weight for at least 3 days to see trends</p>
                </div>
              )}
            </motion.div>

            {/* Body Fat Chart */}
            <motion.div className="card mb-6" {...cardAnim(5)}>
              <div className="flex-between mb-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Percent size={16} style={{ color: 'var(--accent-pink)' }} />
                  <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>Body Fat Trend</h3>
                </div>
                <span className="badge badge-cyan">Last 30 days</span>
              </div>
              {chartData.filter(d => d.bodyFat).length > 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData.filter(d => d.bodyFat)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F472B6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#F472B6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                      tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="bodyFat" stroke="#F472B6" strokeWidth={2}
                      fill="url(#bfGrad)" name="Body Fat (%)" dot={false} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <BarChart3 className="empty-state-icon" />
                  <p className="text-muted">Log body fat to see trends</p>
                </div>
              )}
            </motion.div>

            {/* Weekly summary */}
            <motion.div className="card" {...cardAnim(6)}>
              <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)', marginBottom: 'var(--space-4)' }}>
                Monthly Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
                {(() => {
                  if (!fitnessHistory) return null;
                  const entries = last30.map(d => fitnessHistory[d]).filter(Boolean);
                  const daysLogged = entries.length;
                  const gymDays = entries.filter(e => e.gymCompleted).length;
                  const avgCals = daysLogged ? Math.round(entries.reduce((s, e) => s + (e.calories || 0), 0) / daysLogged) : 0;
                  const avgProtein = daysLogged ? Math.round(entries.reduce((s, e) => s + (e.protein || 0), 0) / daysLogged) : 0;
                  const avgSteps = daysLogged ? Math.round(entries.reduce((s, e) => s + (e.steps || 0), 0) / daysLogged) : 0;

                  return [
                    { label: 'Days Logged', value: daysLogged, color: 'var(--accent-primary)' },
                    { label: 'Gym Days', value: gymDays, color: 'var(--accent-success)' },
                    { label: 'Avg Calories', value: avgCals, color: 'var(--accent-orange)' },
                    { label: 'Avg Protein', value: `${avgProtein}g`, color: 'var(--accent-secondary)' },
                    { label: 'Avg Steps', value: avgSteps.toLocaleString(), color: 'var(--accent-warning)' },
                    { label: 'Avg Weight', value: progressStats.avg ? `${progressStats.avg} kg` : '—', color: 'var(--accent-pink)' },
                  ].map((s, i) => (
                    <div key={i} className="stat-card">
                      <span className="stat-label">{s.label}</span>
                      <span className="text-mono" style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)', color: s.color }}>
                        {s.value}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modals ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {workoutModal && (
          <WorkoutModal
            workout={workoutModal !== 'new' ? workoutModal : null}
            onClose={() => setWorkoutModal(null)}
            onSave={saveWorkout}
          />
        )}
        {mealModal && (
          <MealModal
            mealType={mealModal}
            onClose={() => setMealModal(null)}
            onSave={addMeal}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Inline Editable Value ────────────────────────────────────────────────
function InlineEditable({ value, unit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const handleSave = () => {
    const num = parseFloat(editVal);
    if (!isNaN(num) && num >= 0) onSave(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input className="input" type="number" autoFocus value={editVal}
          onChange={e => setEditVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
          style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-lg)' }} />
        <button className="btn btn-primary btn-sm" onClick={handleSave}><Check size={14} /></button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}><X size={14} /></button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', cursor: 'pointer' }}
      onClick={() => { setEditVal(String(value || 0)); setEditing(true); }}>
      <span className="stat-value">{value || '—'}</span>
      <span className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>{unit}</span>
    </div>
  );
}
