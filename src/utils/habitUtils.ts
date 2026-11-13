import type { Habit } from '../types';
import { getTodayDateString } from './dateUtils';
import { setItemInIndexedDB, getItemFromIndexedDB, STORES } from './indexedDB';

const HABITS_STORAGE_KEY = 'plandroid_habits_v1';

export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'habit-planning',
    title: 'Daily Morning Planning',
    category: 'deep_work',
    targetDaysPerWeek: 7,
    completedDates: [],
    createdAt: Date.now() - 86400000 * 3,
    streak: 0,
    bestStreak: 0,
    color: '#3b82f6',
    reminderTime: '08:30',
    reminderEnabled: true,
  },
  {
    id: 'habit-deepwork',
    title: 'Deep Work Block (>=45m)',
    category: 'deep_work',
    targetDaysPerWeek: 5,
    completedDates: [],
    createdAt: Date.now() - 86400000 * 3,
    streak: 0,
    bestStreak: 0,
    color: '#6366f1',
    reminderTime: '10:00',
    reminderEnabled: true,
  },
  {
    id: 'habit-hydration',
    title: 'Hydration & Mindful Break',
    category: 'break',
    targetDaysPerWeek: 7,
    completedDates: [],
    createdAt: Date.now() - 86400000 * 3,
    streak: 0,
    bestStreak: 0,
    color: '#10b981',
    reminderTime: '14:00',
    reminderEnabled: false,
  },
  {
    id: 'habit-review',
    title: 'Evening Day Review',
    category: 'review',
    targetDaysPerWeek: 5,
    completedDates: [],
    createdAt: Date.now() - 86400000 * 3,
    streak: 0,
    bestStreak: 0,
    color: '#f59e0b',
    reminderTime: '17:30',
    reminderEnabled: true,
  },
];

/**
 * Loads habits from localStorage with fallback to default habits
 */
export function loadHabitsFromStorage(): Habit[] {
  if (typeof window === 'undefined') return DEFAULT_HABITS;
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) return DEFAULT_HABITS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((h) => ({
        ...h,
        completedDates: Array.isArray(h.completedDates) ? h.completedDates : [],
        streak: Number.isFinite(h.streak) ? h.streak : 0,
        bestStreak: Number.isFinite(h.bestStreak) ? h.bestStreak : 0,
      }));
    }
  } catch (err) {
    console.warn('Failed to load habits from localStorage:', err);
  }
  return DEFAULT_HABITS;
}

/**
 * Saves habits to both localStorage and IndexedDB
 */
export function saveHabitsToStorage(habits: Habit[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
    // Asynchronously mirror to IndexedDB
    setItemInIndexedDB(STORES.HABITS, 'all_habits', habits).catch(() => {});
  } catch (err) {
    console.error('Failed to save habits to storage:', err);
  }
}

/**
 * Calculate habit consecutive streak based on completed dates
 */
export function calculateHabitStreak(
  completedDates: string[],
  todayStr: string = getTodayDateString(),
  currentDate: Date = new Date()
): { currentStreak: number; bestStreak: number } {
  if (!Array.isArray(completedDates) || completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const completedSet = new Set(completedDates);
  let streak = 0;

  // Check today
  const isTodayCompleted = completedSet.has(todayStr);
  if (isTodayCompleted) {
    streak = 1;
  }

  // Count backwards from yesterday
  const cursor = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);

  while (true) {
    const ymd = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (completedSet.has(ymd)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best historic streak
  const sorted = Array.from(completedSet).sort();
  let maxStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sorted) {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);

    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > maxStreak) {
      maxStreak = tempStreak;
    }
    prevDate = d;
  }

  return {
    currentStreak: streak,
    bestStreak: Math.max(streak, maxStreak),
  };
}

/**
 * Checks if a habit is completed on a specific date (YYYY-MM-DD)
 */
export function isHabitCompletedOnDate(habit: Habit, dateStr: string): boolean {
  if (!habit || !Array.isArray(habit.completedDates)) return false;
  return habit.completedDates.includes(dateStr);
}

/**
 * Toggles habit completion for a specific date and recomputes streak
 */
export function toggleHabitForDate(
  habit: Habit,
  dateStr: string,
  todayStr: string = getTodayDateString(),
  currentDate: Date = new Date()
): Habit {
  const currentDates = Array.isArray(habit.completedDates) ? [...habit.completedDates] : [];
  const exists = currentDates.includes(dateStr);

  const newCompletedDates = exists
    ? currentDates.filter((d) => d !== dateStr)
    : [...currentDates, dateStr];

  const { currentStreak, bestStreak } = calculateHabitStreak(newCompletedDates, todayStr, currentDate);

  return {
    ...habit,
    completedDates: newCompletedDates,
    streak: currentStreak,
    bestStreak: Math.max(habit.bestStreak || 0, bestStreak),
  };
}
