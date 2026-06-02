import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getLast30Days, formatDateShort, getWeekDays, getDayName } from '../utils/dates';
import {
  Scissors, Plus, Check, Pencil, Trash2, X, Flame,
  CalendarDays, Clock, RotateCcw, Sparkles, StickyNote,
  ChevronRight
} from 'lucide-react';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';

const pageAnim = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, transition: { duration: 0.35 } };
const listItem = { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0 } };

const SCHEDULE_OPTIONS = [
  'Daily',
  'Every 2 days',
  'Every 3 days',
  'Every 4 days',
  'Every 5 days',
  'Weekly',
  'Every 2 weeks',
  'Monthly',
];

function getScheduleDays(schedule) {
  if (!schedule) return 1;
  if (schedule === 'Daily') return 1;
  if (schedule === 'Weekly') return 7;
  if (schedule === 'Every 2 weeks') return 14;
  if (schedule === 'Monthly') return 30;
  const match = schedule.match(/Every (\d+) days?/);
  return match ? parseInt(match[1], 10) : 1;
}

export default function Haircare() {
  const { currentUser } = useAuth();
  const today = todayStr();
  const [showModal, setShowModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editStep, setEditStep] = useState(null);
  const [formName, setFormName] = useState('');
  const [formSchedule, setFormSchedule] = useState('Every 3 days');
  const [noteText, setNoteText] = useState('');
  const [noteStepId, setNoteStepId] = useState(null);

  const [steps, setSteps] = useState([]);
  const [allLogs, setAllLogs] = useState([]);

  useEffect(() => {
    if (currentUser) fetchData();
  }, [currentUser]);

  async function fetchData() {
    if (!currentUser) return;
    
    const { data: stepsData } = await supabase
      .from('haircare_steps')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('isActive', true)
      .order('order');
      
    if (stepsData) setSteps(stepsData);
    
    const { data: logsData } = await supabase
      .from('haircare_logs')
      .select('*')
      .eq('user_id', currentUser.id);
      
    if (logsData) setAllLogs(logsData);
  }

  // Today's log
  const todayLog = useMemo(() => {
    if (!allLogs) return null;
    return allLogs.find(l => l.date === today && l.routineType === 'hair');
  }, [allLogs, today]);

  const completedMap = todayLog?.completed || {};

  // Toggle step
  const toggleStep = async (stepId) => {
    if (!currentUser) return;
    const existing = allLogs?.find(l => l.date === today && l.routineType === 'hair');
    const completed = { ...(existing?.completed || {}) };
    completed[stepId] = !completed[stepId];

    if (existing) {
      await supabase.from('haircare_logs').update({ completed }).eq('id', existing.id);
    } else {
      await supabase.from('haircare_logs').insert([{ 
        user_id: currentUser.id, 
        date: today, 
        routineType: 'hair', 
        completed 
      }]);
    }
    fetchData();
  };

  // Modal handlers
  const openAddModal = () => {
    setEditStep(null);
    setFormName('');
    setFormSchedule('Every 3 days');
    setShowModal(true);
  };

  const openEditModal = (step) => {
    setEditStep(step);
    setFormName(step.name);
    setFormSchedule(step.schedule || 'Every 3 days');
    setShowModal(true);
  };

  const saveStep = async () => {
    if (!formName.trim() || !currentUser) return;
    if (editStep) {
      await supabase.from('haircare_steps').update({
        name: formName.trim(),
        schedule: formSchedule,
      }).eq('id', editStep.id);
    } else {
      await supabase.from('haircare_steps').insert([{
        user_id: currentUser.id,
        routineType: 'hair',
        name: formName.trim(),
        schedule: formSchedule,
        order: (steps?.length || 0),
        isActive: true,
      }]);
    }
    setShowModal(false);
    fetchData();
  };

  const deleteStep = async (id) => {
    if (!currentUser) return;
    await supabase.from('haircare_steps').update({ isActive: false }).eq('id', id);
    fetchData();
  };

  // Notes
  const openNoteModal = (stepId) => {
    const log = allLogs?.find(l => l.date === today && l.routineType === 'hair');
    const notes = log?.notes || {};
    setNoteStepId(stepId);
    setNoteText(notes[stepId] || '');
    setShowNoteModal(true);
  };

  const saveNote = async () => {
    if (!currentUser) return;
    const existing = allLogs?.find(l => l.date === today && l.routineType === 'hair');
    const notes = { ...(existing?.notes || {}) };
    notes[noteStepId] = noteText.trim();

    if (existing) {
      await supabase.from('haircare_logs').update({ notes }).eq('id', existing.id);
    } else {
      await supabase.from('haircare_logs').insert([{ 
        user_id: currentUser.id, 
        date: today, 
        routineType: 'hair', 
        completed: {}, 
        notes 
      }]);
    }
    setShowNoteModal(false);
    fetchData();
  };

  // Calculate next due dates
  const getNextDue = useCallback((stepId, schedule) => {
    if (!allLogs) return null;
    const scheduleDays = getScheduleDays(schedule);

    // Find the last date this step was done
    const sorted = allLogs
      .filter(l => l.routineType === 'hair' && l.completed?.[stepId])
      .sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) return { text: 'Due today', isDue: true, daysUntil: 0 };

    const lastDone = parseISO(sorted[0].date);
    const nextDue = addDays(lastDone, scheduleDays);
    const daysUntil = differenceInDays(nextDue, parseISO(today));

    if (daysUntil <= 0) return { text: 'Due today', isDue: true, daysUntil: 0 };
    if (daysUntil === 1) return { text: 'Due tomorrow', isDue: false, daysUntil: 1 };
    return { text: `Due in ${daysUntil} days`, isDue: false, daysUntil };
  }, [allLogs, today]);

  // Stats
  const stats = useMemo(() => {
    if (!allLogs || !steps) return { streak: 0, totalDays: 0, rate: 0 };
    const last30 = getLast30Days();
    let streak = 0;
    let totalComplete = 0;

    for (let i = last30.length - 1; i >= 0; i--) {
      const day = last30[i];
      const dayLog = allLogs.find(l => l.date === day && l.routineType === 'hair');

      // A day is "complete" if all steps that are DUE on that day are done
      // For simplicity, count if at least one step was done
      const anyDone = dayLog && Object.values(dayLog.completed || {}).some(v => v);
      if (anyDone) {
        totalComplete++;
        if (i === last30.length - 1 || streak > 0) streak++;
      } else {
        if (i >= last30.length - 1) streak = 0;
        else if (streak > 0) break;
      }
    }

    const rate = last30.length > 0 ? Math.round((totalComplete / 30) * 100) : 0;
    return { streak, totalDays: totalComplete, rate };
  }, [allLogs, steps]);

  // Weekly view
  const weekDays = getWeekDays();
  const weeklyView = useMemo(() => {
    if (!steps || !allLogs) return [];

    return steps.map(step => {
      const scheduleDays = getScheduleDays(step.schedule);

      // Find last completion date
      const sorted = allLogs
        .filter(l => l.routineType === 'hair' && l.completed?.[step.id])
        .sort((a, b) => b.date.localeCompare(a.date));

      const lastDone = sorted.length > 0 ? parseISO(sorted[0].date) : null;

      const days = weekDays.map(day => {
        const dayLog = allLogs.find(l => l.date === day && l.routineType === 'hair');
        const isDone = !!dayLog?.completed?.[step.id];

        // Is this day a "due" day?
        let isDue = false;
        if (lastDone) {
          const daysSince = differenceInDays(parseISO(day), lastDone);
          isDue = daysSince >= 0 && daysSince % scheduleDays === 0;
        } else {
          isDue = true; // If never done, everything is due
        }

        return { date: day, isDone, isDue };
      });

      return { step, days };
    });
  }, [steps, allLogs, weekDays]);

  // Heatmap
  const heatmapData = useMemo(() => {
    if (!allLogs || !steps) return [];
    const last30 = getLast30Days();
    return last30.map(day => {
      const dayLog = allLogs.find(l => l.date === day && l.routineType === 'hair');
      let count = 0;
      let total = steps?.length || 1;
      steps?.forEach(s => { if (dayLog?.completed?.[s.id]) count++; });
      const ratio = total > 0 ? count / total : 0;
      let level = 0;
      if (ratio > 0 && ratio <= 0.25) level = 1;
      else if (ratio > 0.25 && ratio <= 0.5) level = 2;
      else if (ratio > 0.5 && ratio < 1) level = 3;
      else if (ratio >= 1) level = 4;
      return { date: day, level, ratio: Math.round(ratio * 100) };
    });
  }, [allLogs, steps]);

  if (!steps) {
    return (
      <div className="page-container">
        <div className="flex-center" style={{ padding: 'var(--space-16) 0' }}>
          <div className="skeleton" style={{ width: 200, height: 24 }} />
        </div>
      </div>
    );
  }

  const dueToday = steps.filter(s => {
    const due = getNextDue(s.id, s.schedule);
    return due?.isDue;
  });

  return (
    <motion.div className="page-container" {...pageAnim}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Scissors size={26} style={{ color: 'var(--accent-pink)' }} />
              Haircare
            </h1>
            <p>Track hair routines & schedules</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <div className="streak-badge">
              <Flame size={16} />
              {stats.streak} day streak
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAddModal}>
              <Plus size={14} /> Add Step
            </button>
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
            <span className="stat-label">Active Days</span>
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

      {/* Due Today Banner */}
      {dueToday.length > 0 && (
        <motion.div
          className="card-gradient"
          style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary-dim)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>
              {dueToday.length} routine{dueToday.length !== 1 ? 's' : ''} due today
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
              {dueToday.map(s => s.name).join(' · ')}
            </div>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
        </motion.div>
      )}

      {/* Steps List */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Sparkles size={18} style={{ color: 'var(--accent-pink)' }} />
            <span style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>
              Today's Routines
            </span>
          </div>
          <span className="badge badge-purple">
            {steps.filter(s => completedMap[s.id]).length}/{steps.length}
          </span>
        </div>

        <div className="habit-list">
          <AnimatePresence mode="popLayout">
            {steps.map((step, i) => {
              const isDone = !!completedMap[step.id];
              const dueInfo = getNextDue(step.id, step.schedule);

              return (
                <motion.div
                  key={step.id}
                  layout
                  {...listItem}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={`checkbox-item ${isDone ? 'checked' : ''}`}
                  onClick={() => toggleStep(step.id)}
                  style={{ position: 'relative', flexWrap: 'wrap' }}
                >
                  <div className="checkbox-circle">
                    {isDone && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                        <Check size={14} style={{ color: 'white' }} />
                      </motion.div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 'var(--fw-medium)', fontSize: 'var(--fs-base)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
                      transition: 'all var(--transition-fast)'
                    }}>
                      {step.name}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      marginTop: 2, flexWrap: 'wrap'
                    }}>
                      <span className="badge badge-cyan" style={{ fontSize: 'var(--fs-xs)' }}>
                        <RotateCcw size={9} />
                        {step.schedule}
                      </span>
                      {dueInfo && (
                        <span style={{
                          fontSize: 'var(--fs-xs)',
                          color: dueInfo.isDue ? 'var(--accent-warning)' : 'var(--text-tertiary)',
                          fontWeight: dueInfo.isDue ? 'var(--fw-semibold)' : 'var(--fw-normal)'
                        }}>
                          {dueInfo.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="habit-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openNoteModal(step.id)} data-tooltip="Add note">
                      <StickyNote size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEditModal(step)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteStep(step.id)} style={{ color: 'var(--accent-danger)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {steps.length === 0 && (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <Scissors className="empty-state-icon" size={32} />
              <h3>No haircare steps</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)' }}>Add your first routine step above</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly View */}
      {weeklyView.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <CalendarDays size={18} style={{ color: 'var(--accent-secondary)' }} />
            <span style={{ fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-base)' }}>
              Weekly Schedule
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr>
                  <th style={{
                    textAlign: 'left', padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)',
                    fontWeight: 'var(--fw-semibold)', borderBottom: '1px solid var(--glass-border)'
                  }}>
                    Routine
                  </th>
                  {weekDays.map(day => (
                    <th key={day} style={{
                      textAlign: 'center', padding: 'var(--space-2) var(--space-1)',
                      fontSize: 'var(--fs-xs)', color: day === today ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                      fontWeight: 'var(--fw-semibold)', borderBottom: '1px solid var(--glass-border)',
                      minWidth: 44
                    }}>
                      <div>{getDayName(day)}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>
                        {format(new Date(day), 'd')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklyView.map(({ step, days }) => (
                  <tr key={step.id}>
                    <td style={{
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-medium)',
                      borderBottom: '1px solid var(--glass-border)',
                      whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {step.name}
                    </td>
                    {days.map(({ date, isDone, isDue }) => (
                      <td key={date} style={{
                        textAlign: 'center', padding: 'var(--space-2) var(--space-1)',
                        borderBottom: '1px solid var(--glass-border)'
                      }}>
                        {isDone ? (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--accent-success)', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Check size={13} style={{ color: 'white' }} />
                          </div>
                        ) : isDue ? (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            border: '2px dashed var(--accent-warning)', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center'
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-warning)' }} />
                          </div>
                        ) : (
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'var(--bg-tertiary)', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center'
                          }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-tertiary)', opacity: 0.3 }} />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-success)' }} /> Done
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px dashed var(--accent-warning)' }} /> Due
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--bg-tertiary)' }} /> Not Due
            </span>
          </div>
        </div>
      )}

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

      {/* Step Modal */}
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
                <h2>{editStep ? 'Edit Step' : 'Add Haircare Step'}</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Step Name</label>
                  <input
                    className="input"
                    placeholder="e.g., Shampoo, Conditioner, Oil Mask..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Schedule</label>
                  <select
                    className="select"
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                  >
                    {SCHEDULE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
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

      {/* Note Modal */}
      <AnimatePresence>
        {showNoteModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNoteModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Progress Note</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowNoteModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">How's it going?</label>
                  <textarea
                    className="input"
                    placeholder="Note any observations, product changes, results..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={4}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveNote}>Save Note</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
