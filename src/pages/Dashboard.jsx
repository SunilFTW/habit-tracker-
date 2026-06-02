import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { todayStr, getGreeting, getLast7Days, getDayName } from '../utils/dates';
import { format } from 'date-fns';
import { Flame, Trophy, TrendingUp, Zap, Quote, Eye, Target, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8 }
};

const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  })
};

function ProgressRing({ value, size = 140, strokeWidth = 8, color = '#7C6BF0' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="progress-ring-value" style={{ fontSize: size > 120 ? '2rem' : '1.25rem' }}>
        {value}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser } = useAuth();
  const today = todayStr();
  const last7 = useMemo(() => getLast7Days(), []);

  const [habits, setHabits] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [weekLogs, setWeekLogs] = useState([]);
  const [hardThing, setHardThing] = useState(null);
  const [quote, setQuote] = useState(null);
  const [futureSelfEntry, setFutureSelfEntry] = useState(null);
  const [settings, setSettings] = useState({});
  const [fitnessToday, setFitnessToday] = useState(null);
  const [streak, setStreak] = useState(0);
  const [eliteDays, setEliteDays] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    
    async function fetchData() {
      const [
        { data: habitsData },
        { data: logsData },
        { data: wLogsData },
        { data: htData },
        { data: quotesData },
        { data: fsData },
        { data: setData },
        { data: fitData }
      ] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', currentUser.id),
        supabase.from('discipline_logs').select('*').eq('user_id', currentUser.id).eq('date', today),
        supabase.from('discipline_logs').select('*').eq('user_id', currentUser.id).in('date', last7),
        supabase.from('hard_things').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).maybeSingle(),
        supabase.from('quotes').select('*'),
        supabase.from('future_self').select('*').eq('user_id', currentUser.id),
        supabase.from('settings').select('*').eq('user_id', currentUser.id),
        supabase.from('workouts').select('*').eq('user_id', currentUser.id).eq('date', today).limit(1).maybeSingle()
      ]);

      if (habitsData) setHabits(habitsData.filter(h => (!h.isArchived && !h.is_archived) && h.frequency === 'daily'));
      if (logsData) setTodayLogs(logsData);
      if (wLogsData) setWeekLogs(wLogsData);
      if (htData) setHardThing(htData);
      
      if (quotesData && quotesData.length > 0) {
        const dayIdx = new Date().getDate() % quotesData.length;
        setQuote(quotesData[dayIdx]);
      }
      
      if (fsData && fsData.length > 0) {
        const idx = Math.floor(Math.random() * fsData.length);
        setFutureSelfEntry(fsData[idx]);
      }

      if (setData) {
        const map = {};
        setData.forEach(s => { map[s.key] = s.value; });
        setSettings(map);
      }

      if (fitData) setFitnessToday(fitData);
    }
    
    fetchData();
  }, [currentUser, today, last7]);

  // Calculations
  const completedIds = new Set(todayLogs.filter(l => l.completed).map(l => l.habitId || l.habit_id));
  const disciplineHabits = habits.filter(h => h.category === 'discipline');
  const disciplineCompleted = disciplineHabits.filter(h => completedIds.has(h.id)).length;
  const disciplineScore = disciplineHabits.length > 0
    ? Math.round((disciplineCompleted / disciplineHabits.length) * 100) : 0;

  const totalCompleted = habits.filter(h => completedIds.has(h.id)).length;
  const dailyCompletion = habits.length > 0
    ? Math.round((totalCompleted / habits.length) * 100) : 0;

  const mandatoryHabits = habits.filter(h => h.isMandatory || h.is_mandatory);
  const isEliteDay = mandatoryHabits.length > 0 && mandatoryHabits.every(h => completedIds.has(h.id));

  // Streaks
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const { data: logs } = await supabase
        .from('discipline_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('date', format(new Date(new Date().setDate(new Date().getDate() - 365)), 'yyyy-MM-dd'));

      const { data: allHabitsData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', currentUser.id);
        
      const allLogs = logs || [];
      const allHabits = allHabitsData || [];

      // Streak
      let s = 0;
      const dHabits = allHabits.filter(h => (!h.isArchived && !h.is_archived) && h.category === 'discipline');
      
      for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayLogs = allLogs.filter(l => l.date === dateStr);
        const done = dHabits.filter(h => dayLogs.some(l => (l.habitId === h.id || l.habit_id === h.id) && l.completed)).length;
        
        if (done > 0) {
          s++;
        } else if (i === 0) {
          continue; 
        } else {
          break;
        }
      }
      setStreak(s);

      // Elite days
      const now = new Date();
      let ed = 0;
      const mHabits = allHabits.filter(h => (h.isMandatory || h.is_mandatory) && (!h.isArchived && !h.is_archived));
      for (let day = 1; day <= now.getDate(); day++) {
        const dateStr = format(new Date(now.getFullYear(), now.getMonth(), day), 'yyyy-MM-dd');
        const dayLogs = allLogs.filter(l => l.date === dateStr);
        const cIds = new Set(dayLogs.filter(l => l.completed).map(l => l.habitId || l.habit_id));
        if (mHabits.length > 0 && mHabits.every(h => cIds.has(h.id))) {
          ed++;
        }
      }
      setEliteDays(ed);
    })();
  }, [currentUser]);

  // Week chart data
  const weekData = last7.map(dateStr => {
    const dayLogs = weekLogs.filter(l => l.date === dateStr);
    const dayCompleted = habits.filter(h => dayLogs.some(l => (l.habitId === h.id || l.habit_id === h.id) && l.completed)).length;
    const pct = habits.length > 0 ? Math.round((dayCompleted / habits.length) * 100) : 0;
    return {
      day: getDayName(dateStr),
      pct,
      isToday: dateStr === today
    };
  });

  // Weight progress
  const weightGoal = settings.weightGoal || 70;
  const currentWeight = fitnessToday?.weight;

  return (
    <motion.div className="page-container" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* Header */}
      <div className="page-header">
        <motion.p className="text-muted" style={{ fontSize: 'var(--fs-base)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {getGreeting()}, {settings.userName || 'Champion'}
        </motion.p>
        <motion.h1 style={{ fontSize: 'var(--fs-2xl)', letterSpacing: '-0.03em' }}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          Did you become better today?
        </motion.h1>
      </div>

      {/* Elite Day Banner */}
      {isEliteDay && (
        <motion.div className="elite-banner mb-6"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div className="elite-emoji">🏆</div>
          <div className="elite-text">Elite Day Achieved!</div>
          <p className="text-muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--space-1)' }}>
            All mandatory habits completed. You're unstoppable.
          </p>
        </motion.div>
      )}

      {/* Main Stats */}
      <div className="grid-4 mb-6">
        {/* Discipline Score */}
        <motion.div className="card-gradient" custom={0} variants={cardVariants} initial="initial" animate="animate"
          style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-6)', padding: 'var(--space-8) var(--space-6)' }}>
          <ProgressRing value={disciplineScore} size={130} />
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--fw-medium)', marginBottom: 'var(--space-1)' }}>
              Discipline Score
            </div>
            <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-bold)' }}>
              {disciplineCompleted}/{disciplineHabits.length} habits
            </div>
            <Link to="/discipline" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'var(--space-2)' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>

        {/* Daily Completion */}
        <motion.div className="card stat-card" custom={1} variants={cardVariants} initial="initial" animate="animate">
          <div className="stat-label flex-between">
            <span>Daily %</span>
            <CheckCircle2 size={16} style={{ color: 'var(--accent-success)' }} />
          </div>
          <div className="stat-value" style={{ color: dailyCompletion >= 80 ? 'var(--accent-success)' : dailyCompletion >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
            {dailyCompletion}%
          </div>
          <div className="progress-bar mt-2">
            <div className="progress-bar-fill" style={{ width: `${dailyCompletion}%` }} />
          </div>
        </motion.div>

        {/* Streak */}
        <motion.div className="card stat-card" custom={2} variants={cardVariants} initial="initial" animate="animate">
          <div className="stat-label flex-between">
            <span>Streak</span>
            <Flame size={16} style={{ color: 'var(--accent-orange)' }} />
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-warning)' }}>
            {streak}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
            {streak === 1 ? 'day' : 'days'} 🔥
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid-3 mb-6">
        {/* Elite Days */}
        <motion.div className="card stat-card" custom={3} variants={cardVariants} initial="initial" animate="animate">
          <div className="stat-label flex-between">
            <span>Elite Days</span>
            <Trophy size={16} style={{ color: 'var(--accent-warning)' }} />
          </div>
          <div className="stat-value">{eliteDays}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>this month</div>
        </motion.div>

        {/* Weight Progress */}
        <motion.div className="card stat-card" custom={4} variants={cardVariants} initial="initial" animate="animate">
          <div className="stat-label flex-between">
            <span>Weight</span>
            <TrendingUp size={16} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <div className="stat-value">
            {currentWeight ? `${currentWeight}kg` : '—'}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
            Goal: {weightGoal}kg
          </div>
        </motion.div>

        {/* Hard Thing */}
        <motion.div className="card" custom={5} variants={cardVariants} initial="initial" animate="animate"
          style={{ borderColor: hardThing?.completed ? 'rgba(52, 211, 153, 0.2)' : hardThing ? 'rgba(251, 191, 36, 0.2)' : 'var(--glass-border)' }}>
          <div className="stat-label flex-between mb-2">
            <span>Today's Hard Thing</span>
            <Zap size={16} style={{ color: 'var(--accent-warning)' }} />
          </div>
          {hardThing ? (
            <>
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)', marginBottom: 'var(--space-2)' }}>
                {hardThing.task}
              </div>
              <span className={`badge ${hardThing.completed ? 'badge-green' : 'badge-yellow'}`}>
                {hardThing.completed ? '✓ Completed' : '⏳ In Progress'}
              </span>
            </>
          ) : (
            <Link to="/hard-thing" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Set today's challenge <ArrowRight size={14} />
            </Link>
          )}
        </motion.div>
      </div>

      {/* Weekly Overview */}
      <motion.div className="card mb-6" custom={6} variants={cardVariants} initial="initial" animate="animate">
        <div className="stat-label mb-4">Weekly Overview</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)', height: 100 }}>
          {weekData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {d.pct}%
              </div>
              <div style={{
                width: '100%', maxWidth: 36,
                height: `${Math.max(d.pct * 0.8, 4)}px`,
                borderRadius: 'var(--radius-sm)',
                background: d.isToday ? 'var(--accent-gradient)' : d.pct >= 80 ? 'var(--accent-success)' : d.pct >= 50 ? 'rgba(124,107,240,0.5)' : 'var(--bg-tertiary)',
                transition: 'height 0.4s ease'
              }} />
              <div style={{
                fontSize: 'var(--fs-xs)',
                color: d.isToday ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: d.isToday ? 'var(--fw-semibold)' : 'var(--fw-normal)'
              }}>
                {d.day}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quote & Future Self */}
      <div className="grid-2 mb-6">
        {/* Daily Quote */}
        <motion.div custom={7} variants={cardVariants} initial="initial" animate="animate">
          {quote && (
            <div className="quote-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Quote size={14} style={{ color: 'var(--accent-primary)' }} />
                <span className="stat-label" style={{ margin: 0 }}>Daily Quote</span>
              </div>
              <div className="quote-text">"{quote.text}"</div>
              <div className="quote-author">— {quote.author}</div>
            </div>
          )}
        </motion.div>

        {/* Future Self Reminder */}
        <motion.div custom={8} variants={cardVariants} initial="initial" animate="animate">
          <div className="card" style={{ borderLeft: '3px solid var(--accent-secondary)', borderRadius: '0 var(--radius-lg) var(--radius-lg) 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Eye size={14} style={{ color: 'var(--accent-secondary)' }} />
              <span className="stat-label" style={{ margin: 0 }}>Future Self Reminder</span>
            </div>
            {futureSelfEntry ? (
              <>
                <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-medium)', marginBottom: 'var(--space-2)' }}>
                  {futureSelfEntry.title}
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {futureSelfEntry.content?.substring(0, 150)}{futureSelfEntry.content?.length > 150 ? '...' : ''}
                </div>
              </>
            ) : (
              <Link to="/future-self" style={{ fontSize: 'var(--fs-sm)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Write to your future self <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
