import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getLast30Days, formatDateShort } from '../utils/dates';
import {
  Sparkles, Sun, Moon, Plus, Check, Pencil, Trash2, X,
  Flame, Droplets, CalendarDays, Package
} from 'lucide-react';

const pageAnim = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, transition: { duration: 0.35 } };
const listItem = { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0 } };

export default function Skincare() {
  const { currentUser } = useAuth();
  const today = todayStr();
  const [showModal, setShowModal] = useState(false);
  const [editStep, setEditStep] = useState(null);
  const [formName, setFormName] = useState('');
  const [formProduct, setFormProduct] = useState('');
  const [formRoutineType, setFormRoutineType] = useState('morning');

  const [morningSteps, setMorningSteps] = useState([]);
  const [nightSteps, setNightSteps] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  async function fetchData() {
    if (!currentUser) return;

    const { data: stepsData } = await supabase
      .from('skincare_steps')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('isActive', true)
      .order('order');
      
    if (stepsData) {
      setMorningSteps(stepsData.filter(s => s.routineType === 'morning'));
      setNightSteps(stepsData.filter(s => s.routineType === 'night'));
    }

    const { data: logsData } = await supabase
      .from('skincare_logs')
      .select('*')
      .eq('user_id', currentUser.id);
      
    if (logsData) {
      setAllLogs(logsData);
      setTodayLogs(logsData.filter(l => l.date === today));
    }
  }

  // Build today's completion map per routine
  const getCompletionMap = useCallback((routineType) => {
    if (!todayLogs) return {};
    const log = todayLogs.find(l => l.routineType === routineType);
    return log?.completed || {};
  }, [todayLogs]);

  const morningCompleted = getCompletionMap('morning');
  const nightCompleted = getCompletionMap('night');

  // Toggle step completion
  const toggleStep = async (stepId, routineType) => {
    if (!currentUser) return;
    const existing = todayLogs?.find(l => l.routineType === routineType);
    const completed = { ...(existing?.completed || {}) };
    completed[stepId] = !completed[stepId];

    if (existing) {
      await supabase.from('skincare_logs').update({ completed }).eq('id', existing.id);
    } else {
      await supabase.from('skincare_logs').insert([{ 
        user_id: currentUser.id, 
        date: today, 
        routineType, 
        completed 
      }]);
    }
    fetchData();
  };

  // Modal handlers
  const openAddModal = (type) => {
    setEditStep(null);
    setFormName('');
    setFormProduct('');
    setFormRoutineType(type);
    setShowModal(true);
  };

  const openEditModal = (step) => {
    setEditStep(step);
    setFormName(step.name);
    setFormProduct(step.product || '');
    setFormRoutineType(step.routineType);
    setShowModal(true);
  };

  const saveStep = async () => {
    if (!formName.trim() || !currentUser) return;
    if (editStep) {
      await supabase.from('skincare_steps').update({
        name: formName.trim(),
        product: formProduct.trim(),
        routineType: formRoutineType,
      }).eq('id', editStep.id);
    } else {
      const steps = formRoutineType === 'morning' ? morningSteps : nightSteps;
      await supabase.from('skincare_steps').insert([{
        user_id: currentUser.id,
        routineType: formRoutineType,
        name: formName.trim(),
        product: formProduct.trim(),
        order: (steps?.length || 0),
        isActive: true,
      }]);
    }
    setShowModal(false);
    fetchData();
  };

  const deleteStep = async (id) => {
    if (!currentUser) return;
    await supabase.from('skincare_steps').update({ isActive: false }).eq('id', id);
    fetchData();
  };

  // Stats
  const stats = useMemo(() => {
    if (!allLogs || !morningSteps || !nightSteps) return { streak: 0, totalDays: 0, rate: 0 };

    const last30 = getLast30Days();
    let streak = 0;
    let totalComplete = 0;

    // Count days where both routines are complete
    for (let i = last30.length - 1; i >= 0; i--) {
      const day = last30[i];
      const dayLogs = allLogs.filter(l => l.date === day);
      const mLog = dayLogs.find(l => l.routineType === 'morning');
      const nLog = dayLogs.find(l => l.routineType === 'night');

      const mDone = morningSteps.length > 0 && morningSteps.every(s => mLog?.completed?.[s.id]);
      const nDone = nightSteps.length > 0 && nightSteps.every(s => nLog?.completed?.[s.id]);
      const dayComplete = (morningSteps.length === 0 || mDone) && (nightSteps.length === 0 || nDone);

      if (dayComplete && (morningSteps.length > 0 || nightSteps.length > 0)) {
        totalComplete++;
        if (i === last30.length - 1 || streak > 0) streak++;
        else streak = 0;
      } else {
        if (i >= last30.length - 1) streak = 0;
        else if (streak > 0) break;
      }
    }

    const rate = last30.length > 0 ? Math.round((totalComplete / 30) * 100) : 0;
    return { streak, totalDays: totalComplete, rate };
  }, [allLogs, morningSteps, nightSteps]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    if (!allLogs || !morningSteps || !nightSteps) return [];
    const last30 = getLast30Days();
    return last30.map(day => {
      const dayLogs = allLogs.filter(l => l.date === day);
      const mLog = dayLogs.find(l => l.routineType === 'morning');
      const nLog = dayLogs.find(l => l.routineType === 'night');

      let completedCount = 0;
      let totalSteps = (morningSteps?.length || 0) + (nightSteps?.length || 0);

      morningSteps?.forEach(s => { if (mLog?.completed?.[s.id]) completedCount++; });
      nightSteps?.forEach(s => { if (nLog?.completed?.[s.id]) completedCount++; });

      const ratio = totalSteps > 0 ? completedCount / totalSteps : 0;
      let level = 0;
      if (ratio > 0 && ratio <= 0.25) level = 1;
      else if (ratio > 0.25 && ratio <= 0.5) level = 2;
      else if (ratio > 0.5 && ratio < 1) level = 3;
      else if (ratio >= 1) level = 4;

      return { date: day, level, ratio: Math.round(ratio * 100) };
    });
  }, [allLogs, morningSteps, nightSteps]);

  const getRoutineProgress = (steps, completedMap) => {
    if (!steps || steps.length === 0) return 0;
    const done = steps.filter(s => completedMap[s.id]).length;
    return Math.round((done / steps.length) * 100);
  };

  const morningProgress = getRoutineProgress(morningSteps, morningCompleted);
  const nightProgress = getRoutineProgress(nightSteps, nightCompleted);

  if (!morningSteps || !nightSteps) {
    return (
      <div className="page-container">
        <div className="flex-center" style={{ padding: 'var(--space-16) 0' }}>
          <div className="skeleton" style={{ width: 200, height: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <motion.div className="page-container" {...pageAnim}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Sparkles size={26} style={{ color: 'var(--accent-pink)' }} />
              Skincare
            </h1>
            <p>Morning & night routine tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <div className="streak-badge">
              <Flame size={16} />
              {stats.streak} day streak
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-card">
            <span className="stat-label">Current Streak</span>
            <span className="stat-value" style={{ color: 'var(--accent-warning)' }}>{stats.streak}</span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>days</span>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-card">
            <span className="stat-label">Days Completed</span>
            <span className="stat-value" style={{ color: 'var(--accent-success)' }}>{stats.totalDays}</span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>out of 30</span>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="stat-card">
            <span className="stat-label">Consistency</span>
            <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>{stats.rate}%</span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>last 30 days</span>
          </div>
        </div>
      </div>

      {/* Morning & Night Routines */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Morning */}
        <RoutineSection
          title="Morning Routine"
          icon={<Sun size={20} />}
          iconColor="var(--accent-warning)"
          gradientStart="rgba(251, 191, 36, 0.08)"
          steps={morningSteps}
          completedMap={morningCompleted}
          progress={morningProgress}
          onToggle={(id) => toggleStep(id, 'morning')}
          onAdd={() => openAddModal('morning')}
          onEdit={openEditModal}
          onDelete={deleteStep}
        />
        {/* Night */}
        <RoutineSection
          title="Night Routine"
          icon={<Moon size={20} />}
          iconColor="var(--accent-secondary)"
          gradientStart="rgba(0, 212, 255, 0.08)"
          steps={nightSteps}
          completedMap={nightCompleted}
          progress={nightProgress}
          onToggle={(id) => toggleStep(id, 'night')}
          onAdd={() => openAddModal('night')}
          onEdit={openEditModal}
          onDelete={deleteStep}
        />
      </div>

      {/* Consistency Heatmap */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <CalendarDays size={18} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>
              Last 30 Days
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(l => (
              <div key={l} className={`heatmap-cell level-${l}`} style={{ width: 12, height: 12, aspectRatio: 'auto' }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div className="heatmap-grid">
          {heatmapData.map((d, i) => (
            <div
              key={i}
              className={`heatmap-cell level-${d.level}`}
              data-tooltip={`${formatDateShort(d.date)} — ${d.ratio}%`}
              style={{ minWidth: 0 }}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editStep ? 'Edit Step' : 'Add Step'}</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Routine</label>
                  <select
                    className="select"
                    value={formRoutineType}
                    onChange={(e) => setFormRoutineType(e.target.value)}
                  >
                    <option value="morning">☀️ Morning</option>
                    <option value="night">🌙 Night</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Step Name</label>
                  <input
                    className="input"
                    placeholder="e.g., Cleanser, Toner, Serum..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Product Used (optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Package size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <input
                      className="input"
                      placeholder="e.g., CeraVe Foaming Cleanser"
                      value={formProduct}
                      onChange={(e) => setFormProduct(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveStep}>
                  {editStep ? 'Update' : 'Add Step'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ========== Routine Section Component ========== */
function RoutineSection({ title, icon, iconColor, gradientStart, steps, completedMap, progress, onToggle, onAdd, onEdit, onDelete }) {
  return (
    <div className="card" style={{ background: `linear-gradient(180deg, ${gradientStart} 0%, var(--bg-secondary) 40%)` }}>
      {/* Section Header */}
      <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: `${iconColor}22`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: iconColor
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>{title}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
              {steps.filter(s => completedMap[s.id]).length}/{steps.length} done
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar" style={{ marginBottom: 'var(--space-4)', height: 4 }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${progress}%`,
            background: iconColor,
            transition: 'width 0.5s var(--ease-out)'
          }}
        />
      </div>

      {/* Steps List */}
      <div className="habit-list">
        <AnimatePresence mode="popLayout">
          {steps.map((step, i) => {
            const isDone = !!completedMap[step.id];
            return (
              <motion.div
                key={step.id}
                layout
                {...listItem}
                transition={{ delay: i * 0.03, duration: 0.25 }}
                className={`checkbox-item ${isDone ? 'checked' : ''}`}
                onClick={() => onToggle(step.id)}
                style={{ position: 'relative' }}
              >
                <div className="checkbox-circle">
                  {isDone && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                      <Check size={14} style={{ color: 'white' }} />
                    </motion.div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={isDone ? 'checkbox-label' : ''} style={{
                    fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-base)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}>
                    {step.name}
                  </div>
                  {step.product && (
                    <div style={{
                      fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)',
                      display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                      marginTop: 2
                    }}>
                      <Droplets size={10} />
                      {step.product}
                    </div>
                  )}
                </div>
                <div className="habit-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(step)}>
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(step.id)} style={{ color: 'var(--accent-danger)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {steps.length === 0 && (
          <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
            <Droplets className="empty-state-icon" size={32} />
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>No steps yet — tap Add to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
