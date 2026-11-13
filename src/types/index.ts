export type TaskCategory =
  | 'deep_work'
  | 'meeting'
  | 'admin'
  | 'review'
  | 'break'
  | 'personal';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type EnergyLevel = 'high' | 'medium' | 'low';
export type PreferredSlot = 'morning' | 'afternoon' | 'evening' | 'any';
export type Language = 'en' | 'am';
export type AlarmSound = 'bell' | 'digital' | 'chime' | 'harp';
export type FocusAudioTrack = 'off' | 'brown_noise' | 'white_noise' | 'rain' | 'alpha_wave';
export type TimeFormat = '12h' | '24h';
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'weekdays' | 'custom';
export type WeeklyViewMode = 'calendar' | 'agenda' | 'list';

export interface TaskRecurrence {
  frequency: RecurrenceFrequency;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  until?: string;        // "YYYY-MM-DD"
}

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category?: TaskCategory; // legacy fallback
  categoryId?: string;     // Custom category reference
  durationMinutes: number;
  actualDurationMinutes?: number; // Accumulated actual time spent in minutes
  priority: TaskPriority;
  energyLevel: EnergyLevel;
  preferredSlot?: PreferredSlot;
  date?: string;      // "YYYY-MM-DD", defaults to today if undefined
  startTime?: string; // "HH:MM" 24h
  endTime?: string;   // "HH:MM" 24h
  isFixedTime?: boolean;
  manualOrder?: number; // Manual drag-to-reorder index overriding default time sort
  timelineSegment?: 'morning' | 'afternoon' | 'evening'; // Explicit segment after manual drag
  completed: boolean;
  completedAt?: number; // timestamp when completed
  notes?: string;
  createdAt: number;
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number; // 0 for at-time, 1, 5, 10, 15, 30, etc.
  recurrence?: TaskRecurrence;
}

export interface WorkScheduleConfig {
  workStart: string; // "09:00"
  workEnd: string;   // "17:30"
  bufferMinutes: number; // e.g. 10
  lunchStart: string; // "12:30"
  lunchDuration: number; // 45
  timeFormat?: TimeFormat; // '12h' | '24h'
  weekStartsOn?: 0 | 1;    // 1 = Monday (default), 0 = Sunday
  defaultTaskDuration?: number; // default 30
  defaultReminderMinutes?: number; // default 10
  defaultFocusDuration?: number; // default 25
  defaultBreakDuration?: number; // default 5
  dailyGoalMinutes?: number;     // default 240
  weeklyGoalMinutes?: number;    // default 1200
}

export interface NotificationSettings {
  isPinned: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  autoAdvance: boolean;
  showInNativeSystem: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  language: Language;
  timerAlarmEnabled: boolean;
  timerAlarmSound: AlarmSound;
  alarmVolume: number; // 0.1 to 1.0
  oneMinuteWarningEnabled: boolean;
  alarmRepeatIntervalSeconds: number; // 0 for off, 60 for 1m, 120 for 2m, 300 for 5m
  taskCompletionSound: boolean;
  persistentReminders: boolean;
  reminderIntervalMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  taskReminderAlarms?: boolean;
  theme?: 'dark' | 'light' | 'system';
  focusAudioTrack?: FocusAudioTrack;
  focusAudioVolume?: number;
}

export interface Habit {
  id: string;
  title: string;
  category: TaskCategory;
  categoryId?: string;
  targetDaysPerWeek: number; // e.g. 7 for everyday, 5 for weekdays
  completedDates: string[]; // List of YYYY-MM-DD
  reminderTime?: string; // "HH:MM"
  reminderEnabled?: boolean;
  createdAt: number;
  streak: number;
  bestStreak: number;
  color?: string;
}

export type MainSection = 'plans' | 'weekly' | 'analytics' | 'settings';
export type ViewTab = 'timeline' | 'kanban' | 'focus' | 'analytics' | 'specs';

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle: string;
  durationMinutes: number;
  completedAt: number;
  type?: 'focus' | 'break';
}

export interface ActiveTimerState {
  taskId: string;
  taskTitle: string;
  targetEndTime: number; // Epoch timestamp ms
  durationSeconds: number;
  pausedRemainingSeconds?: number;
  isRunning: boolean;
  startedAt: number;
  hasTriggeredCompletion?: boolean;
  hasWarnedOneMinute?: boolean;
  mode?: 'countdown' | 'stopwatch';
  type?: 'focus' | 'break';
  elapsedSeconds?: number;
}

