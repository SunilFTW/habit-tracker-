import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getWeekDays, formatDateShort } from '../utils/dates';
import { format, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  Palette, Clock, Play, Pause, RotateCcw, Plus, BookOpen, Search,
  Briefcase, FileText, GraduationCap, Target, Trash2, X, TrendingUp,
  Timer, CalendarDays, ChevronRight
} from 'lucide-react';

const CATEGORIES = [
  { key: 'design', label: 'Design Practice', icon: Palette, color: '#7C6BF0' },
  { key: 'research', label: 'UX Research', icon: Search, color: '#00D4FF' },
  { key: 'portfolio', label: 'Portfolio Work', icon: Briefcase, color: '#F472B6' },
  { key: 'casestudy', label: 'Case Study', icon: FileText, color: '#FB923C' },
  { key: 'learning', label: 'Learning', icon: GraduationCap, color: '#34D399' },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const pageAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
};

const cardAnim = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }
});

export default function DesignerGrowth() {
  const { currentUser } = useAuth();
  const today = todayStr();
  const weekDays = getWeekDays();
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  // === Timer State ===
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerCategory, setTimerCategory] = useState('design');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  const handleTimerToggle = () => setTimerRunning(r => !r);

  const handleTimerReset = () => {
    setTimerRunning(false);
    setElapsed(0);
  };

  const handleTimerLog = async () => {
    if (elapsed < 60 || !currentUser) return;
    const hours = parseFloat((elapsed / 3600).toFixed(2));
    await supabase.from('growthLogs').insert([{
      user_id: currentUser.id,
      date: today,
      category: timerCategory,
      hours,
      notes: `Deep work session — ${formatTimer(elapsed)}`
    }]);
    handleTimerReset();
    fetchData();
  };

  // === Log Modal ===
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ category: 'design', hours: '', notes: '' });

  const handleAddLog = async () => {
    const hrs = parseFloat(logForm.hours);
    if (!hrs || hrs <= 0 || !currentUser) return;
    await supabase.from('growthLogs').insert([{
      user_id: currentUser.id,
      date: today,
      category: logForm.category,
      hours: hrs,
      notes: logForm.notes
    }]);
    setLogForm({ category: 'design', hours: '', notes: '' });
    setShowLogModal(false);
    fetchData();
  };

  // === Goal Modal ===
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', progress: 0 });

  const handleAddGoal = async () => {
    if (!goalForm.title.trim() || !currentUser) return;
    const { count } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('category', 'growth');
    await supabase.from('goals').insert([{
      user_id: currentUser.id,
      category: 'growth',
      title: goalForm.title,
      status: 'active',
      deadline: goalForm.description,
      order: count || 0,
      progress: goalForm.progress || 0
    }]);
    setGoalForm({ title: '', description: '', progress: 0 });
    setShowGoalModal(false);
    fetchData();
  };

  // === Data Queries ===
  const [weekLogs, setWeekLogs] = useState([]);
  const [monthLogs, setMonthLogs] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [goals, setGoals] = useState([]);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    const [wRes, mRes, tRes, gRes] = await Promise.all([
      supabase.from('growthLogs').select('*').eq('user_id', currentUser.id).gte('date', weekDays[0]).lte('date', weekDays[6]),
      supabase.from('growthLogs').select('*').eq('user_id', currentUser.id).gte('date', monthStart).lte('date', monthEnd),
      supabase.from('growthLogs').select('*').eq('user_id', currentUser.id).eq('date', today),
      supabase.from('goals').select('*').eq('user_id', currentUser.id).eq('category', 'growth').order('order', { ascending: true })
    ]);
    if (wRes.data) setWeekLogs(wRes.data);
    if (mRes.data) setMonthLogs(mRes.data);
    if (tRes.data) setTodayLogs(tRes.data);
    if (gRes.data) setGoals(gRes.data);
  }, [currentUser, weekDays[0], weekDays[6], monthStart, monthEnd, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // === Computed ===
  const weekTotal = (weekLogs || []).reduce((s, l) => s + l.hours, 0);
  const monthTotal = (monthLogs || []).reduce((s, l) => s + l.hours, 0);
  const todayTotal = (todayLogs || []).reduce((s, l) => s + l.hours, 0);

  // Chart data: hours per category this week
  const chartData = CATEGORIES.map(cat => {
    const hrs = (weekLogs || [])
      .filter(l => l.category === cat.key)
      .reduce((s, l) => s + l.hours, 0);
    return { name: cat.label.split(' ')[0], hours: parseFloat(hrs.toFixed(1)), fill: cat.color };
  });

  // Per-day chart data
  const dailyChartData = weekDays.map(day => {
    const dayLogs = (weekLogs || []).filter(l => l.date === day);
    const entry = { name: formatDateShort(day) };
    CATEGORIES.forEach(cat => {
      entry[cat.key] = parseFloat(
        dayLogs.filter(l => l.category === cat.key).reduce((s, l) => s + l.hours, 0).toFixed(1)
      );
    });
    return entry;
  });

  const handleDeleteLog = async (id) => {
    await supabase.from('growthLogs').delete().eq('id', id);
    fetchData();
  };

  const handleUpdateGoalProgress = async (id, progress) => {
    await supabase.from('goals').update({ progress: Math.min(100, Math.max(0, progress)) }).eq('id', id);
    fetchData();
  };

  const handleDeleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id);
    fetchData();
  };

  return (
    <motion.div className="page-container" {...pageAnim}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Palette size={24} style={{ color: 'var(--accent-primary)' }} />
              Designer Growth
            </h1>
            <p>Track your professional design journey</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-secondary" onClick={() => setShowLogModal(true)}>
              <Plus size={16} /> Log Hours
            </button>
            <button className="btn btn-primary" onClick={() => setShowGoalModal(true)}>
              <Target size={16} /> Add Goal
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div className="grid-3 mb-6" {...cardAnim(0)}>
        <div className="card stat-card">
          <span className="stat-label">Today</span>
          <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {todayTotal.toFixed(1)}h
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Week</span>
          <span className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
            {weekTotal.toFixed(1)}h
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">This Month</span>
          <span className="stat-value" style={{ color: 'var(--accent-success)' }}>
            {monthTotal.toFixed(1)}h
          </span>
        </div>
      </motion.div>

      {/* Deep Work Timer */}
      <motion.div className="card-glow mb-6" {...cardAnim(1)}>
        <div className="flex-between mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Timer size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>Deep Work Timer</h3>
          </div>
          <select
            className="select"
            style={{ width: 'auto', minWidth: '160px' }}
            value={timerCategory}
            onChange={e => setTimerCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-4)', padding: 'var(--space-6) 0'
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-4xl)',
            fontWeight: 'var(--fw-bold)', letterSpacing: '-0.02em',
            background: timerRunning ? 'var(--accent-gradient)' : 'none',
            WebkitBackgroundClip: timerRunning ? 'text' : 'unset',
            WebkitTextFillColor: timerRunning ? 'transparent' : 'var(--text-primary)',
            backgroundClip: timerRunning ? 'text' : 'unset',
          }}>
            {formatTimer(elapsed)}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              className={`btn ${timerRunning ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleTimerToggle}
              style={{ minWidth: '120px' }}
            >
              {timerRunning ? <Pause size={16} /> : <Play size={16} />}
              {timerRunning ? 'Pause' : 'Start'}
            </button>
            <button className="btn btn-secondary" onClick={handleTimerReset}>
              <RotateCcw size={16} /> Reset
            </button>
            {elapsed >= 60 && (
              <motion.button
                className="btn btn-primary"
                onClick={handleTimerLog}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Plus size={16} /> Log Session
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Weekly Chart */}
      <motion.div className="card mb-6" {...cardAnim(2)}>
        <div className="flex-between mb-4">
          <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-secondary)' }} />
            Weekly Breakdown
          </h3>
          <span className="badge badge-cyan">{weekTotal.toFixed(1)}h total</span>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={dailyChartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: '#8B8BA7', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8B8BA7', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip
                contentStyle={{
                  background: '#1C1C30',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}
                labelStyle={{ color: '#F0F0F8' }}
              />
              {CATEGORIES.map(cat => (
                <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={cat.color} radius={[0, 0, 0, 0]} name={cat.label} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
          {CATEGORIES.map(cat => (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color }} />
              {cat.label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Goals */}
      <motion.div className="mb-6" {...cardAnim(3)}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Target size={14} /> Growth Goals
        </h3>
        {(!goals || goals.length === 0) ? (
          <div className="card empty-state" style={{ padding: 'var(--space-8) var(--space-6)' }}>
            <Target className="empty-state-icon" />
            <h3>No goals yet</h3>
            <p>Set design goals to track your progress</p>
          </div>
        ) : (
          <div className="flex-col gap-3">
            {goals.map((goal, i) => (
              <motion.div
                key={goal.id}
                className="card"
                {...cardAnim(i * 0.5)}
              >
                <div className="flex-between mb-2">
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)' }}>{goal.title}</h4>
                    {goal.deadline && (
                      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                        {goal.deadline}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className="text-mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-primary)' }}>
                      {goal.progress || 0}%
                    </span>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDeleteGoal(goal.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <motion.div
                    className={`progress-bar-fill ${(goal.progress || 0) >= 100 ? 'success' : ''}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goal.progress || 0}
                    onChange={e => handleUpdateGoalProgress(goal.id, parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Today's Logs */}
      <motion.div {...cardAnim(4)}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <CalendarDays size={14} /> Today's Log
        </h3>
        {(!todayLogs || todayLogs.length === 0) ? (
          <div className="card empty-state" style={{ padding: 'var(--space-6)' }}>
            <Clock className="empty-state-icon" />
            <h3>No entries today</h3>
            <p>Start the timer or log hours manually</p>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {todayLogs.map(log => {
              const cat = CATEGORY_MAP[log.category] || CATEGORIES[0];
              const Icon = cat.icon;
              return (
                <motion.div
                  key={log.id}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: `${cat.color}22`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0
                  }}>
                    <Icon size={18} style={{ color: cat.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)' }}>
                      {cat.label}
                    </div>
                    {log.notes && (
                      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {log.notes}
                      </div>
                    )}
                  </div>
                  <span className="text-mono" style={{
                    fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)',
                    color: cat.color
                  }}>
                    {log.hours}h
                  </span>
                  <button className="btn btn-ghost btn-icon" onClick={() => handleDeleteLog(log.id)}>
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Log Hours Modal */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowLogModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Log Hours</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowLogModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select
                    className="select"
                    value={logForm.category}
                    onChange={e => setLogForm({ ...logForm, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Hours</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 2.5"
                    step="0.25"
                    min="0.25"
                    value={logForm.hours}
                    onChange={e => setLogForm({ ...logForm, hours: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Notes (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What did you work on?"
                    value={logForm.notes}
                    onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowLogModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddLog}>
                  <Plus size={16} /> Log Hours
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Add Goal</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowGoalModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Goal Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Complete Case Study"
                    value={goalForm.title}
                    onChange={e => setGoalForm({ ...goalForm, title: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Target Description</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Finish by end of June"
                    value={goalForm.description}
                    onChange={e => setGoalForm({ ...goalForm, description: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Initial Progress: {goalForm.progress}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={goalForm.progress}
                    onChange={e => setGoalForm({ ...goalForm, progress: parseInt(e.target.value) })}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowGoalModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddGoal}>
                  <Target size={16} /> Create Goal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
