import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getWeekDays, formatDateShort } from '../utils/dates';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import {
  LayoutDashboard, CheckSquare, SprayCan, Wallet, BookOpen, FileText,
  Plus, Trash2, X, Check, DollarSign, CalendarDays, TrendingUp,
  Home, Sparkles, ShoppingCart, Utensils, Car, Zap, Heart, GraduationCap,
  MoreHorizontal, ChevronRight, ListChecks
} from 'lucide-react';

const TABS = [
  { key: 'tasks', label: 'Daily Tasks', icon: CheckSquare },
  { key: 'cleaning', label: 'Room Cleaning', icon: SprayCan },
  { key: 'expenses', label: 'Expenses', icon: Wallet },
  { key: 'weekly', label: 'Weekly Review', icon: BookOpen },
  { key: 'monthly', label: 'Monthly Review', icon: FileText },
];

const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Food & Dining', icon: Utensils, color: '#FB923C' },
  { key: 'transport', label: 'Transport', icon: Car, color: '#00D4FF' },
  { key: 'shopping', label: 'Shopping', icon: ShoppingCart, color: '#F472B6' },
  { key: 'utilities', label: 'Utilities', icon: Zap, color: '#FBBF24' },
  { key: 'health', label: 'Health', icon: Heart, color: '#34D399' },
  { key: 'education', label: 'Education', icon: GraduationCap, color: '#7C6BF0' },
  { key: 'other', label: 'Other', icon: MoreHorizontal, color: '#8B8BA7' },
];

const EXPENSE_CAT_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.key, c]));

const DEFAULT_CLEANING_TASKS = [
  'Make Bed', 'Organize Desk', 'Vacuum Floor', 'Clean Bathroom',
  'Wipe Surfaces', 'Take Out Trash', 'Do Laundry', 'Mop Floor'
];

const pageAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
};

const cardAnim = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }
});

export default function LifeManagement() {
  const today = todayStr();
  const [activeTab, setActiveTab] = useState('tasks');

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const monthLabel = format(new Date(), 'MMMM yyyy');
  const weekLabel = `Week of ${formatDateShort(weekStart)}`;

  return (
    <motion.div className="page-container" {...pageAnim}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <LayoutDashboard size={24} style={{ color: 'var(--accent-primary)' }} />
              Life Management
            </h1>
            <p>Organize your daily life</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Icon size={14} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'tasks' && <TasksSection key="tasks" today={today} />}
        {activeTab === 'cleaning' && <CleaningSection key="cleaning" today={today} />}
        {activeTab === 'expenses' && <ExpensesSection key="expenses" today={today} monthStart={monthStart} monthEnd={monthEnd} monthLabel={monthLabel} />}
        {activeTab === 'weekly' && <ReviewSection key="weekly" type="weekly" today={today} weekStart={weekStart} weekEnd={weekEnd} label={weekLabel} />}
        {activeTab === 'monthly' && <ReviewSection key="monthly" type="monthly" today={today} weekStart={monthStart} weekEnd={monthEnd} label={monthLabel} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================
   TASKS SECTION
   ============================ */
function TasksSection({ today }) {
  const { currentUser } = useAuth();
  const [newTask, setNewTask] = useState('');
  const [tasks, setTasks] = useState([]);

  const fetchTasks = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .eq('category', 'life');
    if (data) setTasks(data);
  }, [currentUser, today]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAdd = async () => {
    if (!newTask.trim() || !currentUser) return;
    const count = (tasks || []).length;
    const { error } = await supabase.from('tasks').insert([{
      user_id: currentUser.id,
      date: today,
      title: newTask.trim(),
      completed: false,
      category: 'life',
      sort_order: count
    }]);
    if (error) alert("Task Insert Error: " + error.message);
    setNewTask('');
    fetchTasks();
  };

  const handleToggle = async (id, completed) => {
    const { error } = await supabase.from('tasks').update({ completed: !completed }).eq('id', id);
    if (error) alert("Task Update Error: " + error.message);
    fetchTasks();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) alert("Task Delete Error: " + error.message);
    fetchTasks();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const completedCount = (tasks || []).filter(t => t.completed).length;
  const totalCount = (tasks || []).length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {/* Progress */}
      {totalCount > 0 && (
        <motion.div className="card mb-4" {...cardAnim(0)}>
          <div className="flex-between mb-2">
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
              {completedCount}/{totalCount} completed
            </span>
            <span className="text-mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-primary)' }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="progress-bar">
            <motion.div
              className={`progress-bar-fill ${progress >= 100 ? 'success' : ''}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </motion.div>
      )}

      {/* Add Task */}
      <motion.div className="card mb-4" {...cardAnim(1)}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="text"
            className="input"
            placeholder="Add a task for today..."
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus size={16} />
          </button>
        </div>
      </motion.div>

      {/* Task List */}
      {(!tasks || tasks.length === 0) ? (
        <div className="card empty-state">
          <ListChecks className="empty-state-icon" />
          <h3>No tasks yet</h3>
          <p>Add your first task for today</p>
        </div>
      ) : (
        <div className="flex-col gap-2">
          <AnimatePresence>
            {[...(tasks || [])].sort((a, b) => a.completed - b.completed || a.sort_order - b.sort_order).map((task, i) => (
              <motion.div
                key={task.id}
                className={`checkbox-item ${task.completed ? 'checked' : ''}`}
                onClick={() => handleToggle(task.id, task.completed)}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16, height: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                layout
              >
                <div className="checkbox-circle">
                  {task.completed && <Check size={14} style={{ color: 'white' }} />}
                </div>
                <span className="checkbox-label" style={{
                  flex: 1,
                  textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? 'var(--text-tertiary)' : 'var(--text-primary)'
                }}>
                  {task.title}
                </span>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                  style={{ opacity: 0.5 }}
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ============================
   CLEANING SECTION
   ============================ */
function CleaningSection({ today }) {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);

  const fetchTasks = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .eq('category', 'cleaning');
    if (data) setTasks(data);
  }, [currentUser, today]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Seed default cleaning tasks if none exist for today
  const seedCleaningTasks = async () => {
    if (!currentUser) return;
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .eq('category', 'cleaning');
    
    if (count === 0) {
      await supabase.from('tasks').insert(
        DEFAULT_CLEANING_TASKS.map((title, i) => ({
          user_id: currentUser.id,
          date: today,
          title,
          completed: false,
          category: 'cleaning',
          sort_order: i
        }))
      );
      fetchTasks();
    }
  };

  const handleToggle = async (id, completed) => {
    await supabase.from('tasks').update({ completed: !completed }).eq('id', id);
    fetchTasks();
  };

  const completedCount = (tasks || []).filter(t => t.completed).length;
  const totalCount = (tasks || []).length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {totalCount === 0 ? (
        <div className="card empty-state">
          <SprayCan className="empty-state-icon" />
          <h3>No cleaning tasks for today</h3>
          <p>Load the default cleaning checklist</p>
          <button className="btn btn-primary mt-4" onClick={seedCleaningTasks}>
            <Plus size={16} /> Load Checklist
          </button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <motion.div className="card mb-4" {...cardAnim(0)}>
            <div className="flex-between mb-2">
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                🧹 {completedCount}/{totalCount} done
              </span>
              <span className="text-mono" style={{ fontSize: 'var(--fs-sm)', color: progress >= 100 ? 'var(--accent-success)' : 'var(--accent-primary)' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="progress-bar">
              <motion.div
                className={`progress-bar-fill ${progress >= 100 ? 'success' : ''}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            {progress >= 100 && (
              <motion.p
                style={{ textAlign: 'center', marginTop: 'var(--space-3)', fontSize: 'var(--fs-sm)', color: 'var(--accent-success)' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              >
                ✨ Room is spotless! Great job!
              </motion.p>
            )}
          </motion.div>

          <div className="flex-col gap-2">
            {[...(tasks || [])].sort((a, b) => a.sort_order - b.sort_order).map((task, i) => (
              <motion.div
                key={task.id}
                className={`checkbox-item ${task.completed ? 'checked' : ''}`}
                onClick={() => handleToggle(task.id, task.completed)}
                {...cardAnim(i)}
                layout
              >
                <div className="checkbox-circle">
                  {task.completed && <Check size={14} style={{ color: 'white' }} />}
                </div>
                <span style={{
                  flex: 1,
                  textDecoration: task.completed ? 'line-through' : 'none',
                  color: task.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  fontWeight: 'var(--fw-medium)'
                }}>
                  {task.title}
                </span>
                {task.completed && <Sparkles size={16} style={{ color: 'var(--accent-success)', opacity: 0.7 }} />}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ============================
   EXPENSES SECTION
   ============================ */
function ExpensesSection({ today, monthStart, monthEnd, monthLabel }) {
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'food', note: '' });

  const [monthExpenses, setMonthExpenses] = useState([]);
  const [todayExpenses, setTodayExpenses] = useState([]);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    const [mRes, tRes] = await Promise.all([
      supabase.from('expenses').select('*').eq('user_id', currentUser.id).gte('date', monthStart).lte('date', monthEnd),
      supabase.from('expenses').select('*').eq('user_id', currentUser.id).eq('date', today)
    ]);
    if (mRes.data) setMonthExpenses(mRes.data);
    if (tRes.data) setTodayExpenses(tRes.data);
  }, [currentUser, monthStart, monthEnd, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const monthTotal = (monthExpenses || []).reduce((s, e) => s + e.amount, 0);
  const todayTotal = (todayExpenses || []).reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const map = {};
    (monthExpenses || []).forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return EXPENSE_CATEGORIES
      .map(c => ({ ...c, total: map[c.key] || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses]);

  const handleAdd = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0 || !currentUser) return;
    await supabase.from('expenses').insert([{
      user_id: currentUser.id,
      date: today,
      amount: amt,
      category: form.category,
      note: form.note
    }]);
    setForm({ amount: '', category: 'food', note: '' });
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    fetchData();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stats */}
      <motion.div className="grid-2 mb-4" {...cardAnim(0)}>
        <div className="card stat-card">
          <span className="stat-label">Today's Spending</span>
          <span className="stat-value" style={{ color: 'var(--accent-warning)' }}>
            ₹{todayTotal.toLocaleString()}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">{monthLabel}</span>
          <span className="stat-value" style={{ color: 'var(--accent-danger)' }}>
            ₹{monthTotal.toLocaleString()}
          </span>
        </div>
      </motion.div>

      {/* Add Expense */}
      <motion.div className="mb-4" {...cardAnim(1)}>
        <button className="btn btn-primary w-full" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Expense
        </button>
      </motion.div>

      {/* Category Breakdown */}
      {categoryTotals.length > 0 && (
        <motion.div className="card mb-4" {...cardAnim(2)}>
          <h4 style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-semibold)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Monthly Breakdown
          </h4>
          <div className="flex-col gap-3">
            {categoryTotals.map(cat => {
              const Icon = cat.icon;
              const pct = monthTotal > 0 ? (cat.total / monthTotal) * 100 : 0;
              return (
                <div key={cat.key}>
                  <div className="flex-between mb-1">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Icon size={14} style={{ color: cat.color }} />
                      <span style={{ fontSize: 'var(--fs-sm)' }}>{cat.label}</span>
                    </div>
                    <span className="text-mono" style={{ fontSize: 'var(--fs-sm)', color: cat.color }}>
                      ₹{cat.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 4 }}>
                    <motion.div
                      className="progress-bar-fill"
                      style={{ background: cat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Today's Expenses */}
      <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <CalendarDays size={14} /> Today's Expenses
      </h3>
      {(!todayExpenses || todayExpenses.length === 0) ? (
        <div className="card empty-state" style={{ padding: 'var(--space-6)' }}>
          <Wallet className="empty-state-icon" />
          <h3>No expenses today</h3>
          <p>Track your spending to stay on budget</p>
        </div>
      ) : (
        <div className="flex-col gap-2">
          {todayExpenses.map((expense, i) => {
            const cat = EXPENSE_CAT_MAP[expense.category] || EXPENSE_CATEGORIES[6];
            const Icon = cat.icon;
            return (
              <motion.div
                key={expense.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
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
                  {expense.note && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {expense.note}
                    </div>
                  )}
                </div>
                <span className="text-mono" style={{
                  fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', color: 'var(--accent-warning)'
                }}>
                  ₹{expense.amount.toLocaleString()}
                </span>
                <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(expense.id)}>
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Add Expense</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-lg)' }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select
                    className="select"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Note (optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="What was this for?"
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAdd}>
                  <DollarSign size={16} /> Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ============================
   REVIEW SECTION (Weekly / Monthly)
   ============================ */
function ReviewSection({ type, today, weekStart, weekEnd, label }) {
  const { currentUser } = useAuth();
  const dateKey = type === 'weekly' ? weekStart : format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const [review, setReview] = useState(null);
  const [content, setContent] = useState('');

  const fetchReview = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('type', type)
      .eq('date', dateKey)
      .limit(1);
    
    if (data && data.length > 0) {
      setReview(data[0]);
      setContent(data[0].content || '');
    } else {
      setReview(null);
      setContent('');
    }
  }, [currentUser, type, dateKey]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  useEffect(() => {
    setContent('');
    setReview(null);
  }, [type, dateKey]);

  const handleSave = async () => {
    if (!currentUser) return;
    if (review) {
      await supabase.from('reviews').update({ content }).eq('id', review.id);
    } else {
      await supabase.from('reviews').insert([{
        user_id: currentUser.id,
        date: dateKey,
        type,
        content
      }]);
    }
    fetchReview();
  };

  const prompts = type === 'weekly'
    ? [
      "What went well this week?",
      "What could be improved?",
      "Key learnings & insights?",
      "Top priorities for next week?"
    ]
    : [
      "What were this month's biggest wins?",
      "What habits need attention?",
      "How did I grow personally/professionally?",
      "Goals for next month?"
    ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div className="card-glow" {...cardAnim(0)}>
        <div className="flex-between mb-4">
          <div>
            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-semibold)' }}>
              {type === 'weekly' ? '📝 Weekly' : '📊 Monthly'} Review
            </h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
              {label}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <Check size={14} /> Save
          </button>
        </div>

        {/* Prompts */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)'
        }}>
          {prompts.map((prompt, i) => (
            <motion.button
              key={i}
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setContent(prev => prev ? `${prev}\n\n## ${prompt}\n` : `## ${prompt}\n`);
              }}
              {...cardAnim(i)}
              style={{ fontSize: 'var(--fs-xs)' }}
            >
              <ChevronRight size={12} />
              {prompt}
            </motion.button>
          ))}
        </div>

        <textarea
          className="input"
          style={{
            minHeight: '300px',
            lineHeight: 1.8,
            fontSize: 'var(--fs-base)',
            background: 'var(--bg-primary)',
          }}
          placeholder={`Start your ${type} reflection here...\n\nTip: Click the prompts above for guidance.`}
          value={content}
          onChange={e => setContent(e.target.value)}
        />

        {review && (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)', textAlign: 'right' }}>
            Last saved · {review.date}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
