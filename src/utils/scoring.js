import { db } from '../db/database';
import { todayStr } from './dates';

/**
 * Calculate daily discipline score
 * @param {string} date - Date string (yyyy-MM-dd)
 * @returns {Promise<{score: number, completed: number, total: number}>}
 */
export async function calculateDailyScore(date = todayStr()) {
  const habits = await db.habits
    .where('category').equals('discipline')
    .and(h => !h.isArchived)
    .toArray();

  if (habits.length === 0) return { score: 0, completed: 0, total: 0 };

  const logs = await db.dailyLogs
    .where('[date+habitId]')
    .between([date, 0], [date, Infinity])
    .toArray();

  const completedIds = new Set(logs.filter(l => l.completed).map(l => l.habitId));
  const completed = habits.filter(h => completedIds.has(h.id)).length;

  return {
    score: Math.round((completed / habits.length) * 100),
    completed,
    total: habits.length
  };
}

/**
 * Calculate overall daily completion across ALL habits
 */
export async function calculateOverallCompletion(date = todayStr()) {
  const habits = await db.habits
    .filter(h => !h.isArchived && h.frequency === 'daily')
    .toArray();

  if (habits.length === 0) return { percentage: 0, completed: 0, total: 0 };

  const logs = await db.dailyLogs
    .where('[date+habitId]')
    .between([date, 0], [date, Infinity])
    .toArray();

  const completedIds = new Set(logs.filter(l => l.completed).map(l => l.habitId));
  const completed = habits.filter(h => completedIds.has(h.id)).length;

  return {
    percentage: Math.round((completed / habits.length) * 100),
    completed,
    total: habits.length
  };
}

/**
 * Check if today is an Elite Day
 */
export async function checkEliteDay(date = todayStr()) {
  const mandatoryHabits = await db.habits
    .filter(h => h.isMandatory && !h.isArchived)
    .toArray();

  if (mandatoryHabits.length === 0) return false;

  const logs = await db.dailyLogs
    .where('[date+habitId]')
    .between([date, 0], [date, Infinity])
    .toArray();

  const completedIds = new Set(logs.filter(l => l.completed).map(l => l.habitId));
  return mandatoryHabits.every(h => completedIds.has(h.id));
}

/**
 * Calculate streak (consecutive days with score > 0)
 */
export async function calculateStreak() {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const { score } = await calculateDailyScore(dateStr);
    if (score > 0 || i === 0) {
      if (score > 0) streak++;
      else break;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate elite day streak
 */
export async function calculateEliteStreak() {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const isElite = await checkEliteDay(dateStr);
    if (isElite || i === 0) {
      if (isElite) streak++;
      else break;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Count elite days in a month
 */
export async function countEliteDaysInMonth(year, month) {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (await checkEliteDay(dateStr)) count++;
  }

  return count;
}

/**
 * Get hard thing streak
 */
export async function getHardThingStreak() {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const entry = await db.hardThings.where('date').equals(dateStr).first();
    if (entry && entry.completed) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}
