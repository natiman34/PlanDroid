import type { Task, WorkScheduleConfig, NotificationSettings, FocusSession, ActiveTimerState, Habit } from '../types';
import { DEFAULT_SCHEDULE_CONFIG } from './scheduler';
import { getTodayDateString } from './dateUtils';
import { setItemInIndexedDB, getItemFromIndexedDB, STORES } from './indexedDB';
import {
  type CustomCategory,
  loadCategoriesFromStorage,
  saveCategoriesToStorage,
  DEFAULT_CUSTOM_CATEGORIES,
} from './categoryUtils';
import { loadHabitsFromStorage, saveHabitsToStorage, DEFAULT_HABITS } from './habitUtils';

// LocalStorage Keys
const TASKS_KEY = 'plandroid_personal_plans_v3';
const CONFIG_KEY = 'plandroid_config_v2';
const SETTINGS_KEY = 'plandroid_notification_settings_v3';
const FOCUS_SESSIONS_KEY = 'plandroid_focus_sessions_v1';
const ACTIVE_TIMER_KEY = 'plandroid_active_timer_v1';
const DAILY_GOAL_KEY = 'plandroid_daily_goal_mins_v1';

export const DEFAULT_DAILY_FOCUS_GOAL_MINS = 240; // 4 Hours default daily focus target

export function loadDailyGoalFromStorage(): number {
  if (typeof window === 'undefined') return DEFAULT_DAILY_FOCUS_GOAL_MINS;
  try {
    const raw = localStorage.getItem(DAILY_GOAL_KEY);
    if (!raw) return DEFAULT_DAILY_FOCUS_GOAL_MINS;
    const val = Number(raw);
    return Number.isFinite(val) && val > 0 ? Math.min(1440, Math.max(15, val)) : DEFAULT_DAILY_FOCUS_GOAL_MINS;
  } catch {
    return DEFAULT_DAILY_FOCUS_GOAL_MINS;
  }
}

export function saveDailyGoalToStorage(minutes: number): void {
  if (typeof window === 'undefined') return;
  try {
    const safeVal = Math.min(1440, Math.max(15, Math.round(minutes)));
    localStorage.setItem(DAILY_GOAL_KEY, safeVal.toString());
    setItemInIndexedDB(STORES.DAILY_GOAL, 'target_minutes', safeVal).catch(() => {});
  } catch (err) {
    console.error('Failed to save daily focus goal:', err);
  }
}

// Clean initial empty state: no sample or demo plans preloaded
export function loadTasksFromStorage(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const today = getTodayDateString();
    return parsed.map((t: any) => ({
      ...t,
      date: t.date || today,
      actualDurationMinutes: typeof t.actualDurationMinutes === 'number' ? t.actualDurationMinutes : 0,
      completed: Boolean(t.completed),
    }));
  } catch {
    return [];
  }
}

export function saveTasksToStorage(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    setItemInIndexedDB(STORES.TASKS, 'all_tasks', tasks).catch(() => {});
  } catch (err) {
    console.error('Failed to save tasks to localStorage:', err);
  }
}

export function loadConfigFromStorage(): WorkScheduleConfig {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULE_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_SCHEDULE_CONFIG;
    return { ...DEFAULT_SCHEDULE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SCHEDULE_CONFIG;
  }
}

export function saveConfigToStorage(config: WorkScheduleConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    setItemInIndexedDB(STORES.CONFIG, 'schedule_config', config).catch(() => {});
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

export function loadNotificationSettings(): NotificationSettings {
  const initialPermission: NotificationPermission | 'unsupported' =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  const defaults: NotificationSettings = {
    isPinned: true,
    soundEnabled: true,
    vibrateEnabled: true,
    autoAdvance: true,
    showInNativeSystem: false,
    permissionStatus: initialPermission,
    language: 'en',
    timerAlarmEnabled: true,
    timerAlarmSound: 'bell',
    alarmVolume: 0.8,
    oneMinuteWarningEnabled: true,
    alarmRepeatIntervalSeconds: 60,
    taskCompletionSound: true,
    persistentReminders: false,
    reminderIntervalMinutes: 30,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    theme: 'dark',
    focusAudioTrack: 'off',
    focusAudioVolume: 0.45,
  };

  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setItemInIndexedDB(STORES.SETTINGS, 'user_settings', settings).catch(() => {});
  } catch (err) {
    console.error('Failed to save notification settings:', err);
  }
}

export function loadFocusSessionsFromStorage(): FocusSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOCUS_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFocusSessionsToStorage(sessions: FocusSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(sessions));
    setItemInIndexedDB(STORES.FOCUS_SESSIONS, 'all_sessions', sessions).catch(() => {});
  } catch (err) {
    console.error('Failed to save focus sessions:', err);
  }
}

export function loadActiveTimerFromStorage(): ActiveTimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_TIMER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveActiveTimerToStorage(state: ActiveTimerState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (state) {
      localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(state));
      setItemInIndexedDB(STORES.ACTIVE_TIMER, 'current_timer', state).catch(() => {});
    } else {
      localStorage.removeItem(ACTIVE_TIMER_KEY);
      setItemInIndexedDB(STORES.ACTIVE_TIMER, 'current_timer', null).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to save active timer:', err);
  }
}

export interface BackupDataPayload {
  version: number;
  exportedAt: string;
  tasks: Task[];
  habits?: Habit[];
  categories?: CustomCategory[];
  config: WorkScheduleConfig;
  settings: NotificationSettings;
  focusSessions: FocusSession[];
  dailyGoalMinutes: number;
}

export function exportAllUserData(): BackupDataPayload {
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    tasks: loadTasksFromStorage(),
    habits: loadHabitsFromStorage(),
    categories: loadCategoriesFromStorage(),
    config: loadConfigFromStorage(),
    settings: loadNotificationSettings(),
    focusSessions: loadFocusSessionsFromStorage(),
    dailyGoalMinutes: loadDailyGoalFromStorage(),
  };
}

export function importUserData(jsonStr: string): { success: boolean; message: string; data?: BackupDataPayload } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Invalid JSON format.' };
    }

    // Deduplicate and save tasks
    if (Array.isArray(parsed.tasks)) {
      const existing = loadTasksFromStorage();
      const existingIds = new Set(existing.map((t) => t.id));
      const mergedTasks = [...existing];
      for (const t of parsed.tasks) {
        if (!existingIds.has(t.id)) {
          mergedTasks.push(t);
          existingIds.add(t.id);
        }
      }
      saveTasksToStorage(mergedTasks);
      parsed.tasks = mergedTasks;
    }

    // Deduplicate and save habits
    if (Array.isArray(parsed.habits)) {
      const existingHabits = loadHabitsFromStorage();
      const existingHabitIds = new Set(existingHabits.map((h) => h.id));
      const mergedHabits = [...existingHabits];
      for (const h of parsed.habits) {
        if (!existingHabitIds.has(h.id)) {
          mergedHabits.push(h);
          existingHabitIds.add(h.id);
        }
      }
      saveHabitsToStorage(mergedHabits);
      parsed.habits = mergedHabits;
    }

    // Save custom categories
    if (Array.isArray(parsed.categories)) {
      const existingCats = loadCategoriesFromStorage();
      const existingCatIds = new Set(existingCats.map((c) => c.id));
      const mergedCats = [...existingCats];
      for (const c of parsed.categories) {
        if (!existingCatIds.has(c.id)) {
          mergedCats.push(c);
          existingCatIds.add(c.id);
        }
      }
      saveCategoriesToStorage(mergedCats);
      parsed.categories = mergedCats;
    }

    if (parsed.config && typeof parsed.config === 'object') {
      saveConfigToStorage(parsed.config);
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      saveNotificationSettings(parsed.settings);
    }
    if (Array.isArray(parsed.focusSessions)) {
      const existingSessions = loadFocusSessionsFromStorage();
      const existingSessionIds = new Set(existingSessions.map((s) => s.id));
      const mergedSessions = [...existingSessions];
      for (const s of parsed.focusSessions) {
        if (!existingSessionIds.has(s.id)) {
          mergedSessions.push(s);
          existingSessionIds.add(s.id);
        }
      }
      saveFocusSessionsToStorage(mergedSessions);
      parsed.focusSessions = mergedSessions;
    }
    if (typeof parsed.dailyGoalMinutes === 'number') {
      saveDailyGoalToStorage(parsed.dailyGoalMinutes);
    }

    return { success: true, message: 'Backup data imported successfully!', data: parsed };
  } catch (err: any) {
    return { success: false, message: `Failed to import data: ${err?.message || 'Parse error'}` };
  }
}

/**
 * Checks IndexedDB for fallback data if localStorage appears empty
 */
export async function recoverFromIndexedDBIfEmpty(): Promise<{
  tasks?: Task[];
  habits?: Habit[];
  categories?: CustomCategory[];
  focusSessions?: FocusSession[];
} | null> {
  try {
    const currentTasks = loadTasksFromStorage();
    if (currentTasks.length > 0) return null; // Not empty

    const idbTasks = await getItemFromIndexedDB<Task[]>(STORES.TASKS, 'all_tasks');
    const idbHabits = await getItemFromIndexedDB<Habit[]>(STORES.HABITS, 'all_habits');
    const idbCategories = await getItemFromIndexedDB<CustomCategory[]>(STORES.CATEGORIES, 'all_categories');
    const idbSessions = await getItemFromIndexedDB<FocusSession[]>(STORES.FOCUS_SESSIONS, 'all_sessions');

    if (idbTasks && idbTasks.length > 0) {
      saveTasksToStorage(idbTasks);
      if (idbHabits) saveHabitsToStorage(idbHabits);
      if (idbCategories) saveCategoriesToStorage(idbCategories);
      if (idbSessions) saveFocusSessionsToStorage(idbSessions);
      return {
        tasks: idbTasks,
        habits: idbHabits || undefined,
        categories: idbCategories || undefined,
        focusSessions: idbSessions || undefined,
      };
    }
  } catch {
    // fallback
  }
  return null;
}
