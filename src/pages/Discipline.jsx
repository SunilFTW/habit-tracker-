import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getLast30Days, getDayName } from '../utils/dates';
import { format } from 'date-fns';
import { Target, Plus, Edit3, Trash2, Check, X, Flame, Star, GripVertical } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function Discipline() {
  const { currentUser } = useAuth();
  const today = todayStr();
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [newName, setNewName] = useState('');
  const [newFrequency, setNewFrequency] = useState('daily');
  const [newMandatory, setNewMandatory] = useState(false);

  const [habits, setHabits] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [monthLogs, setMonthLogs] = useState([]);
  const last30 = getLast30Days();

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  async function fetchData() {
    if (!currentUser) return;

    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('category', 'discipline')
      .eq('is_archived', false)
      .order('sort_order');
    if (habitsData) setHabits(habitsData);

    const { data: todayLogsData } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', today);
    if (todayLogsData) setTodayLogs(todayLogsData);

    const { data: monthLogsData } = await supabase
      .from('dailyLogs')
      .select('*')
      .eq('user_id', currentUser.id)
      .in('date', last30);
    if (monthLogsData) setMonthLogs(monthLogsData);
  }

  const completedIds = new Set(todayLogs.filter(l => l.completed).map(l => l.habit_id));
  const completed = habits.filter(h => completedIds.has(h.id)).length;
  const score = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;

  // Streak calculation
  const streakCount = (() => {
    // Simple display — real calculation happens with effect
    return completed > 0 ? '🔥' : '—';
  })();

  const isEliteDay = habits.filter(h => h.is_mandatory).length > 0 &&
    habits.filter(h => h.is_mandatory).every(h => completedIds.has(h.id));

  async function toggleHabit(habitId) {
    if (!currentUser) return;
    const existing = todayLogs.find(l => l.habit_id === habitId);
    if (existing) {
      const { error: upErr } = await supabase.from('daily_logs').update({ completed: !existing.completed }).eq('id', existing.id);
      if (upErr) alert("Update Error: " + upErr.message);
    } else {
      const { error: inErr } = await supabase.from('daily_logs').insert([{
        user_id: currentUser.id,
        date: today,
        habit_id: habitId,
        completed: true,
        value: null
      }]);
      if (inErr) alert("Insert Error: " + inErr.message);
    }
    fetchData();
  }

  async function saveHabit() {
    if (!newName.trim() || !currentUser) return;
    if (editingHabit) {
      const { error } = await supabase.from('habits').update({
        name: newName.trim(),
        frequency: newFrequency,
        is_mandatory: newMandatory
      }).eq('id', editingHabit.id);
      if (error) alert("Save Error: " + error.message);
    } else {
      const maxOrder = habits.length > 0 ? Math.max(...habits.map(h => h.sort_order)) + 1 : 0;
      const { error } = await supabase.from('habits').insert([{
        user_id: currentUser.id,
        name: newName.trim(),
        category: 'discipline',
        frequency: newFrequency,
        is_mandatory: newMandatory,
        sort_order: maxOrder,
        is_archived: false,
        created_at: new Date().toISOString(),
        icon: 'target'
      }]);
      if (error) alert("Create Error: " + error.message);
    }
    closeModal();
    fetchData();
  }

  async function deleteHabit(id) {
    if (!currentUser) return;
    await supabase.from('habits').update({ is_archived: true }).eq('id', id);
    fetchData();
  }

  function openEdit(habit) {
    setEditingHabit(habit);
    setNewName(habit.name);
    setNewFrequency(habit.frequency);
    setNewMandatory(habit.is_mandatory);
    setShowModal(true);
  }

  function openNew() {
    setEditingHabit(null);
    setNewName('');
    setNewFrequency('daily');
    setNewMandatory(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingHabit(null);
    setNewName('');
  }

  // Heatmap data for last 30 days
  const heatmapData = last30.map(dateStr => {
    const dayLogs = monthLogs.filter(l => l.date === dateStr);
    const dayCompleted = habits.filter(h => dayLogs.some(l => l.habit_id === h.id && l.completed)).length;
    const pct = habits.length > 0 ? dayCompleted / habits.length : 0;
    let level = 0;
    if (pct > 0) level = 1;
    if (pct >= 0.5) level = 2;
    if (pct >= 0.75) level = 3;
    if (pct >= 1) level = 4;
    return { date: dateStr, level, pct: Math.round(pct * 100) };
  });

  return (
    <motion.div className="page-container" variants={pageVariants} initial="initial" animate="animate">
      <div className="page-header page-header-row">
        <div>
          <h1>⚡ Discipline System</h1>
          <p>Build unbreakable habits, one day at a time.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Add Habit
        </button>
      </div>

      {/* Score Overview */}
      <div className="grid-3 mb-6">
        <motion.div className="card-gradient" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-label">Today's Score</div>
          <div className="stat-value" style={{
            fontSize: 'var(--fs-3xl)',
            color: score >= 80 ? 'var(--accent-success)' : score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)'
          }}>
            {score}%
          </div>
          <div className="progress-bar mt-2">
            <div className="progress-bar-fill" style={{ width: `${score}%` }} />
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            {completed}/{habits.length} completed
          </div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="stat-label">Status</div>
          {isEliteDay ? (
            <div style={{ fontSize: 'var(--fs-xl)', marginTop: 'var(--space-2)' }}>
              🏆 <span style={{ background: 'linear-gradient(135deg, #FBBF24, #F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 'var(--fw-bold)' }}>Elite!</span>
            </div>
          ) : (
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
              {habits.filter(h => h.is_mandatory && !completedIds.has(h.id)).length} mandatory left
            </div>
          )}
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="stat-label">Today</div>
          <div className="stat-value" style={{ fontSize: 'var(--fs-lg)' }}>
            {format(new Date(), 'EEEE')}
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)' }}>
            {format(new Date(), 'MMM d, yyyy')}
          </div>
        </motion.div>
      </div>

      {/* Habit List */}
      <div className="section-title">Daily Habits</div>
      <div className="habit-list mb-6">
        <AnimatePresence>
          {habits.map((habit, i) => {
            const isDone = completedIds.has(habit.id);
            return (
              <motion.div
                key={habit.id}
                className={`habit-item ${isDone ? 'completed' : ''}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                layout
              >
                <button
                  className={`checkbox-circle`}
                  onClick={() => toggleHabit(habit.id)}
                  style={isDone ? {
                    background: 'var(--accent-success)',
                    borderColor: 'var(--accent-success)'
                  } : {}}
                >
                  {isDone && <Check size={12} color="white" />}
                </button>

                <span className="habit-name">
                  {habit.name}
                  {habit.is_mandatory && (
                    <Star size={12} style={{ color: 'var(--accent-warning)', marginLeft: 'var(--space-2)', verticalAlign: 'middle' }} />
                  )}
                </span>

                <div className="habit-actions">
                  <button className="btn btn-ghost btn-icon" onClick={() => openEdit(habit)} style={{ padding: 4 }}>
                    <Edit3 size={14} />
                  </button>
                  <button className="btn btn-ghost btn-icon" onClick={() => deleteHabit(habit.id)} style={{ padding: 4, color: 'var(--accent-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Consistency Heatmap */}
      <div className="section-title">30-Day Consistency</div>
      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {heatmapData.map((d, i) => (
            <div
              key={i}
              className={`heatmap-cell level-${d.level}`}
              data-tooltip={`${d.date}: ${d.pct}%`}
              style={{ width: 18, height: 18 }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>Less</span>
          {[0, 1, 2, 3, 4].map(l => (
            <div key={l} className={`heatmap-cell level-${l}`} style={{ width: 12, height: 12 }} />
          ))}
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>More</span>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <div className="modal-header">
                <h2>{editingHabit ? 'Edit Habit' : 'New Habit'}</h2>
                <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Habit Name</label>
                  <input
                    className="input"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g., Morning Meditation"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && saveHabit()}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Frequency</label>
                  <select className="select" value={newFrequency} onChange={e => setNewFrequency(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekends">Weekends</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)' }}>Mandatory for Elite Day</div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Required for 🏆 Elite status</div>
                  </div>
                  <button
                    className={`toggle ${newMandatory ? 'active' : ''}`}
                    onClick={() => setNewMandatory(!newMandatory)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={saveHabit}>
                  {editingHabit ? 'Save Changes' : 'Add Habit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
