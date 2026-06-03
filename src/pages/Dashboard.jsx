import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getGreeting, getDayName } from '../utils/dates';
import { format } from 'date-fns';
import { CloudRain, Sun, Calendar as CalendarIcon, Check, Plus, ArrowRight, Zap, Target, BookOpen, Music, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8 }
};

const itemAnim = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0, overflow: 'hidden', margin: 0, padding: 0 }
};

export default function Dashboard() {
  const { currentUser } = useAuth();
  const today = todayStr();
  const todayDate = new Date();

  // State
  const [masterList, setMasterList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats / Side items
  const [hardThing, setHardThing] = useState(null);

  const fetchMasterList = async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      // Fetch discipline habits & today's logs
      const [
        { data: habits, error: err1 },
        { data: dailyLogs, error: err2 },
        { data: tasks, error: err3 },
        { data: htData, error: err4 }
      ] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', currentUser.id).eq('is_archived', false).order('order'),
        supabase.from('daily_logs').select('*').eq('user_id', currentUser.id).eq('date', today),
        supabase.from('tasks').select('*').eq('user_id', currentUser.id).eq('date', today).order('sort_order'),
        supabase.from('hard_things').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).maybeSingle(),
      ]);

      if (err1) alert("Habits Error: " + err1.message);
      if (err2) alert("Daily Logs Error: " + err2.message);
      if (err3) alert("Tasks Error: " + err3.message);
      if (err4) alert("Hard Things Error: " + err4.message);

      setHardThing(htData);

      const items = [];

      // Add Habits
      const completedHabitIds = new Set((dailyLogs || []).filter(l => l.completed).map(l => l.habit_id));
      (habits || []).forEach(h => {
        items.push({
          id: `habit-${h.id}`,
          originalId: h.id,
          type: 'habit',
          title: h.name,
          category: h.category,
          completed: completedHabitIds.has(h.id),
          icon: Target,
          time: 'Daily Routine',
          sortOrder: h.order
        });
      });

      // Add Tasks
      (tasks || []).forEach(t => {
        items.push({
          id: `task-${t.id}`,
          originalId: t.id,
          type: 'task',
          title: t.title,
          category: t.category,
          completed: t.completed,
          icon: BookOpen,
          time: t.category === 'cleaning' ? 'Home' : 'Life',
          sortOrder: t.sort_order
        });
      });

      // Sort by completion and then order
      items.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.sortOrder - b.sortOrder;
      });

      setMasterList(items);
    } catch (err) {
      console.error('Error fetching master list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterList();
  }, [currentUser, today]);

  // Handlers
  const handleToggle = async (item) => {
    if (!currentUser) return;
    const isNowCompleted = !item.completed;
    
    // Optimistic update
    setMasterList(prev => prev.map(i => i.id === item.id ? { ...i, completed: isNowCompleted } : i));

    if (item.type === 'habit') {
      const { data: existing, error: fetchErr } = await supabase.from('daily_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .eq('habit_id', item.originalId)
        .maybeSingle();
      
      if (fetchErr) alert("Fetch Error: " + fetchErr.message);
      
      if (existing) {
        const { error: upErr } = await supabase.from('daily_logs').update({ completed: isNowCompleted }).eq('id', existing.id);
        if (upErr) alert("Update Error: " + upErr.message);
      } else {
        const { error: inErr } = await supabase.from('daily_logs').insert([{
          user_id: currentUser.id,
          date: today,
          habit_id: item.originalId,
          completed: true
        }]);
        if (inErr) alert("Insert Error: " + inErr.message);
      }
    } else if (item.type === 'task') {
      const { error: taskErr } = await supabase.from('tasks').update({ completed: isNowCompleted }).eq('id', item.originalId);
      if (taskErr) alert("Task Update Error: " + taskErr.message);
    }
    
    // Re-fetch to guarantee sync
    fetchMasterList();
  };

  const completedCount = masterList.filter(i => i.completed).length;
  const totalCount = masterList.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <motion.div className="page-container" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      
      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: Date & Weather */}
        <div className="dash-col-left">
          <div className="mb-6">
            <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 'var(--fw-extrabold)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Happy<br/>{format(todayDate, 'EEEE')} <span role="img" aria-label="wave">👋</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
              {format(todayDate, 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex-col gap-2 mb-6">
            <Link to="/app/life" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> New Tasks
            </Link>
            <Link to="/app/discipline" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Browse Habits
            </Link>
          </div>

          {/* Mini Calendar (Decorative) */}
          <div className="card mb-6" style={{ padding: 'var(--space-4)' }}>
            <div className="flex-between mb-4">
              <span style={{ fontWeight: 'var(--fw-bold)' }}>{format(todayDate, 'MMMM, yyyy')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: 'var(--fs-xs)' }}>
              {['S','M','T','W','T','F','S'].map(d => <div key={d} style={{ color: 'var(--text-tertiary)' }}>{d}</div>)}
              {Array.from({ length: 31 }).map((_, i) => {
                const isToday = (i + 1) === todayDate.getDate();
                return (
                  <div key={i} style={{
                    padding: '6px 0',
                    borderRadius: '50%',
                    background: isToday ? 'var(--text-primary)' : 'transparent',
                    color: isToday ? 'white' : 'inherit',
                    fontWeight: isToday ? 'bold' : 'normal'
                  }}>
                    {i + 1}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Master Checklist */}
        <div className="dash-col-center">
          
          <div className="widget-header">
            <div className="widget-title">Today's Todos</div>
            <Link to="/app/life" className="widget-link">View Details</Link>
          </div>

          <div className="card" style={{ padding: 'var(--space-5)', minHeight: '600px' }}>
            
            {/* Master Progress */}
            <div className="flex-between mb-2">
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-secondary)' }}>
                Overall Completion
              </span>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)', color: 'var(--accent-primary)' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="progress-bar mb-6" style={{ height: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-tertiary)' }}>
                Loading your day...
              </div>
            ) : masterList.length === 0 ? (
              <div className="empty-state" style={{ border: 'none', background: 'transparent' }}>
                <CheckCircle2 className="empty-state-icon" style={{ color: 'var(--accent-success)' }} />
                <h3>All Clear!</h3>
                <p>You have no tasks or habits for today.</p>
                <Link to="/app/life" className="btn btn-primary mt-4">Add Tasks</Link>
              </div>
            ) : (
              <div className="flex-col gap-3">
                <AnimatePresence>
                  {masterList.map((item) => (
                    <motion.div
                      key={item.id}
                      className={`checkbox-item ${item.completed ? 'checked' : ''}`}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        padding: 'var(--space-2) 0',
                        borderBottom: '1px solid var(--glass-border)',
                        borderRadius: 0
                      }}
                      onClick={() => handleToggle(item)}
                      variants={itemAnim}
                      initial="initial" animate="animate" exit="exit"
                      layout
                    >
                      <div className="checkbox-circle" style={{ 
                        background: item.completed ? 'var(--accent-success)' : 'transparent',
                        borderColor: item.completed ? 'var(--accent-success)' : 'var(--glass-border-hover)'
                      }}>
                        {item.completed && <Check size={14} style={{ color: 'white' }} />}
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                          fontSize: 'var(--fs-base)',
                          fontWeight: 'var(--fw-semibold)',
                          color: item.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                          textDecoration: item.completed ? 'line-through' : 'none'
                        }}>
                          {item.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <item.icon size={12} /> {item.time}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Integrations & Extras */}
        <div className="dash-col-right">
          
          {/* Hard Thing Widget */}
          <div className="widget-header">
            <div className="widget-title">Should Do!</div>
            <Link to="/app/hard-thing" className="widget-link">View Details</Link>
          </div>
          
          <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ background: 'var(--accent-primary-dim)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <Zap size={20} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-bold)' }}>
                {hardThing ? hardThing.task : 'Set your Hard Thing'}
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>
                {hardThing?.completed ? 'Completed 🎉' : 'Do the hard work'}
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>

        </div>

      </div>
    </motion.div>
  );
}

function ChevronRight(props) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  );
}
