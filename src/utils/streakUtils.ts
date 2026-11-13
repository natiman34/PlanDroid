import type { Task } from '../types';
import { getTodayDateString, parseDateString, taskOccursOnDate } from './dateUtils';

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  todayCompleted100: boolean;
  todayTasksCount: number;
  todayCompletedCount: number;
  streakStatusMessage: string;
  nextMilestone: number;
  progressToMilestone: number; // 0 to 100
}

const STREAK_STORAGE_KEY = 'plandroid_streak_data_v1';

export interface StoredStreakState {
  longestStreak: number;
  lastEvaluatedDate?: string;
}

/**
 * Loads stored streak metadata (e.g. longest streak achieved)
 */
export function loadStoredStreak(): StoredStreakState {
  if (typeof window === 'undefined') return { longestStreak: 0 };
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (!raw) return { longestStreak: 0 };
    return JSON.parse(raw);
  } catch {
    return { longestStreak: 0 };
  }
}

/**
 * Saves stored streak metadata
 */
export function saveStoredStreak(state: StoredStreakState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Evaluates whether a given day had 100% task completion.
 * A day qualifies if it had >= 1 planned tasks and all were completed.
 */
export function isDay100PercentComplete(tasks: Task[], dateStr: string): { qualified: boolean; total: number; completed: number } {
  const dayTasks = tasks.filter(t => taskOccursOnDate(t, dateStr));
  if (dayTasks.length === 0) {
    return { qualified: false, total: 0, completed: 0 };
  }
  const completedCount = dayTasks.filter(t => t.completed).length;
  const is100 = completedCount === dayTasks.length;
  return { qualified: is100, total: dayTasks.length, completed: completedCount };
}

/**
 * Calculates current and longest productivity streak of consecutive days with 100% completion.
 */
export function calculateStreak(
  tasks: Task[],
  referenceDateStr = getTodayDateString(),
  referenceDate = new Date()
): StreakStats {
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Check today's status
  const todayEval = isDay100PercentComplete(safeTasks, referenceDateStr);
  const today100 = todayEval.qualified;

  let streak = today100 ? 1 : 0;

  // Walk backwards from yesterday
  const anchor = parseDateString(referenceDateStr);
  let checkDate = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 1);

  // Check up to 365 past days
  for (let i = 0; i < 365; i++) {
    const y = checkDate.getFullYear();
    const m = String(checkDate.getMonth() + 1).padStart(2, '0');
    const d = String(checkDate.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    const dayEval = isDay100PercentComplete(safeTasks, dateKey);

    if (dayEval.total === 0) {
      // Rest day with 0 tasks: preserve streak without incrementing or breaking
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
      continue;
    }

    if (dayEval.qualified) {
      streak += 1;
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
    } else {
      // Encountered a day with incomplete tasks: streak ends
      break;
    }
  }

  // Load and update longest streak
  const stored = loadStoredStreak();
  const longestStreak = Math.max(stored.longestStreak || 0, streak);

  if (longestStreak > (stored.longestStreak || 0)) {
    saveStoredStreak({ longestStreak, lastEvaluatedDate: referenceDateStr });
  }

  // Determine milestone
  const milestones = [3, 7, 14, 21, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak) || (Math.floor(streak / 50) + 1) * 50;
  const prevMilestone = milestones.slice().reverse().find(m => m <= streak) || 0;
  const progressToMilestone = Math.min(
    100,
    Math.round(((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100)
  );

  // Motivational message
  let streakStatusMessage = "Complete all of today's plans to ignite your streak!";
  if (streak === 1) {
    streakStatusMessage = 'Streak ignited! Keep the momentum alive tomorrow.';
  } else if (streak >= 2 && streak < 5) {
    streakStatusMessage = 'Solid consistency! Every 100% day compounds your focus.';
  } else if (streak >= 5 && streak < 10) {
    streakStatusMessage = 'On fire! Your daily completion habit is powerhouse level.';
  } else if (streak >= 10) {
    streakStatusMessage = 'Legendary discipline! You are an elite productivity master.';
  }

  return {
    currentStreak: streak,
    longestStreak,
    todayCompleted100: today100,
    todayTasksCount: todayEval.total,
    todayCompletedCount: todayEval.completed,
    streakStatusMessage,
    nextMilestone,
    progressToMilestone,
  };
}
