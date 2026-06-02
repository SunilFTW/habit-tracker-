import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getLast30Days, formatDate } from '../utils/dates';
import { format } from 'date-fns';
import { Zap, Check, X, Flame, TrendingUp, Calendar, Award, ChevronDown, ChevronUp } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function HardThing() {
  const { currentUser } = useAuth();
  const today = todayStr();
  const [task, setTask] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchEntries() {
    if (!currentUser) return;
    const { data } = await supabase
      .from('hardThings')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false });
    if (data) setAllEntries(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchEntries();
  }, [currentUser]);

  const todayEntry = allEntries.find(e => e.date === today);
  const last30 = getLast30Days();
  const monthEntries = allEntries.filter(e => last30.includes(e.date));

  // Stats
  const totalCompleted = allEntries.filter(e => e.completed).length;
  const totalEntries = allEntries.length;
  const completionRate = totalEntries > 0 ? Math.round((totalCompleted / totalEntries) * 100) : 0;
  const monthCompleted = monthEntries.filter(e => e.completed).length;
  const monthTotal = monthEntries.length;

  // Streak
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    let s = 0;
    for (let i = 0; i < allEntries.length; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const entry = allEntries.find(e => e.date === dateStr);
      if (entry && entry.completed) s++;
      else if (i > 0) break;
    }
    setStreak(s);
  }, [allEntries]);

  async function setHardThing() {
    if (!task.trim()) return;
    if (todayEntry) {
      await supabase.from('hardThings').update({ task: task.trim() }).eq('id', todayEntry.id).eq('user_id', currentUser.id);
    } else {
      await supabase.from('hardThings').insert([{
        user_id: currentUser.id,
        date: today,
        task: task.trim(),
        completed: false,
        completedAt: null
      }]);
    }
    setTask('');
    fetchEntries();
  }

  async function markCompleted(completed) {
    if (!todayEntry) return;
    await supabase.from('hardThings').update({
      completed,
      completedAt: completed ? new Date().toISOString() : null
    }).eq('id', todayEntry.id).eq('user_id', currentUser.id);
    fetchEntries();
  }

  const isEvening = new Date().getHours() >= 17;

  // Heatmap
  const heatmapData = last30.map(dateStr => {
    const entry = monthEntries.find(e => e.date === dateStr);
    let level = 0;
    if (entry) {
      level = entry.completed ? 4 : 2;
    }
    return { date: dateStr, level };
  });

  return (
    <motion.div className="page-container" variants={pageVariants} initial="initial" animate="animate">
      <div className="page-header">
        <h1>⚡ Hard Thing</h1>
        <p>Face what you've been avoiding. Every single day.</p>
      </div>

      {/* Stats Row */}
      <div className="grid-4 mb-6">
        <motion.div className="card stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="stat-label flex-between">
            <span>Streak</span>
            <Flame size={16} style={{ color: 'var(--accent-orange)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>{streak}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>days 🔥</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="stat-label flex-between">
            <span>Completion</span>
            <TrendingUp size={16} style={{ color: 'var(--accent-success)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{completionRate}%</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>all time</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="stat-label flex-between">
            <span>This Month</span>
            <Calendar size={16} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="stat-value">{monthCompleted}/{monthTotal}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>completed</div>
        </motion.div>

        <motion.div className="card stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="stat-label flex-between">
            <span>Total</span>
            <Award size={16} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="stat-value">{totalCompleted}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>hard things done</div>
        </motion.div>
      </div>

      {/* Today's Hard Thing */}
      <motion.div
        className="card-gradient mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        style={{ padding: 'var(--space-8)' }}
      >
        {!todayEntry ? (
          /* Input State */
          <div style={{ textAlign: 'center' }}>
            <Zap size={40} style={{ color: 'var(--accent-warning)', marginBottom: 'var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-2)' }}>
              What is the hardest thing you are avoiding today?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-base)', marginBottom: 'var(--space-6)' }}>
              Be honest with yourself. Name it. Then do it.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: 500, margin: '0 auto' }}>
              <input
                className="input"
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="The thing I'm avoiding..."
                onKeyDown={e => e.key === 'Enter' && setHardThing()}
                style={{ flex: 1, textAlign: 'center', fontSize: 'var(--fs-md)' }}
                autoFocus
              />
              <button className="btn btn-primary" onClick={setHardThing} disabled={!task.trim()}>
                <Zap size={16} /> Set
              </button>
            </div>
          </div>
        ) : todayEntry.completed === false && isEvening ? (
          /* Evening Check */
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-3)' }}>
              Did you complete your hard thing?
            </h2>
            <div style={{
              fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)',
              padding: 'var(--space-4)', background: 'rgba(255,255,255,0.04)',
              borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)',
              border: '1px solid var(--glass-border)'
            }}>
              "{todayEntry.task}"
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ padding: 'var(--space-3) var(--space-8)', fontSize: 'var(--fs-md)', background: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}
                onClick={() => markCompleted(true)}
              >
                <Check size={20} /> Yes, I did it!
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: 'var(--space-3) var(--space-8)', fontSize: 'var(--fs-md)' }}
                onClick={() => markCompleted(false)}
              >
                <X size={20} /> Not yet
              </button>
            </div>
          </div>
        ) : todayEntry.completed ? (
          /* Completed State */
          <div style={{ textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}
            >
              💪
            </motion.div>
            <h2 style={{
              fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-2)',
              background: 'linear-gradient(135deg, var(--accent-success), var(--accent-secondary))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              You crushed it!
            </h2>
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
              "{todayEntry.task}"
            </div>
            <span className="badge badge-green">✓ Completed</span>
          </div>
        ) : (
          /* In Progress */
          <div style={{ textAlign: 'center' }}>
            <Zap size={40} style={{ color: 'var(--accent-warning)', marginBottom: 'var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-3)' }}>
              Today's Hard Thing
            </h2>
            <div style={{
              fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-medium)',
              padding: 'var(--space-4)', background: 'rgba(255,255,255,0.04)',
              borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
              border: '1px solid rgba(251, 191, 36, 0.2)'
            }}>
              "{todayEntry.task}"
            </div>
            <span className="badge badge-yellow">⏳ In Progress</span>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}
                onClick={() => markCompleted(true)}
              >
                <Check size={16} /> Mark Complete
              </button>
              <button
                className="btn btn-danger"
                onClick={() => markCompleted(false)}
              >
                <X size={16} /> I didn't do it
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Consistency */}
      <div className="section-title">30-Day Consistency</div>
      <motion.div className="card mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {heatmapData.map((d, i) => (
            <div
              key={i}
              className={`heatmap-cell level-${d.level}`}
              data-tooltip={d.date}
              style={{ width: 18, height: 18 }}
            />
          ))}
        </div>
      </motion.div>

      {/* History */}
      <button
        className="btn btn-ghost w-full mb-4"
        onClick={() => setShowHistory(!showHistory)}
        style={{ justifyContent: 'space-between' }}
      >
        <span>History ({allEntries.length} entries)</span>
        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex-col gap-2">
              {allEntries.slice(0, 30).map((entry) => (
                <div key={entry.id} className="card" style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderColor: entry.completed ? 'rgba(52, 211, 153, 0.15)' : entry.completed === false ? 'rgba(248, 113, 113, 0.15)' : 'var(--glass-border)'
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: entry.completed ? 'var(--accent-success)' : entry.completed === false ? 'var(--accent-danger)' : 'var(--text-tertiary)',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)' }}>{entry.task}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>{formatDate(entry.date)}</div>
                  </div>
                  <span className={`badge ${entry.completed ? 'badge-green' : 'badge-red'}`}>
                    {entry.completed ? 'Done' : 'Missed'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
