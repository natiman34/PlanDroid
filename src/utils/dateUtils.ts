import type { Task, TimeFormat, WeeklyViewMode } from '../types';

/**
 * Format a Date object to "YYYY-MM-DD" local date string
 */
export function getTodayDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse "YYYY-MM-DD" string into a local Date object (at 00:00:00)
 */
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/**
 * Format a "YYYY-MM-DD" string into readable label (e.g. "Mon, Oct 27" or "October 27, 2026")
 */
export function formatReadableDate(dateStr: string, options?: { includeYear?: boolean; shortDay?: boolean }): string {
  if (!dateStr) return '';
  const date = parseDateString(dateStr);
  const dayNames = options?.shortDay
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayOfWeek = dayNames[date.getDay()];
  const month = monthNames[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();

  if (options?.includeYear) {
    return `${dayOfWeek}, ${month} ${dayNum}, ${year}`;
  }
  return `${dayOfWeek}, ${month} ${dayNum}`;
}

export interface WeekDayInfo {
  dateStr: string;
  dayName: string;
  dayShort: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  date: Date;
}

/**
 * Get all 7 days of the week containing anchorDate.
 * weekStartsOn: 1 = Monday (default), 0 = Sunday
 */
export function getWeekDays(anchorDate: string | Date, weekStartsOn: 0 | 1 = 1): WeekDayInfo[] {
  const date = typeof anchorDate === 'string' ? parseDateString(anchorDate) : new Date(anchorDate);
  const currentDay = date.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Calculate distance back to start of week
  let diff = currentDay - weekStartsOn;
  if (diff < 0) {
    diff += 7;
  }

  const startDate = new Date(date);
  startDate.setDate(date.getDate() - diff);

  const todayStr = getTodayDateString();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayShorts = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const week: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = getTodayDateString(d);

    week.push({
      dateStr,
      dayName: dayNames[d.getDay()],
      dayShort: dayShorts[d.getDay()],
      dayNumber: d.getDate(),
      monthName: monthShorts[d.getMonth()],
      isToday: dateStr === todayStr,
      date: d,
    });
  }

  return week;
}

/**
 * Add or subtract weeks from a date string "YYYY-MM-DD"
 */
export function shiftWeek(dateStr: string, weeks: number): string {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return getTodayDateString(d);
}

/**
 * Format "HH:MM" 24h into preferred time format (12h with AM/PM or 24h)
 */
export function formatTime(timeStr?: string, format: TimeFormat = '24h'): string {
  if (!timeStr) return '';
  if (format === '24h') return timeStr;

  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return timeStr;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
}

/**
 * Calculate duration in minutes between "HH:MM" start and end
 */
export function calculateDurationFromTimes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 30;
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  if (isNaN(sH) || isNaN(eH)) return 30;

  const startMin = sH * 60 + (sM || 0);
  let endMin = eH * 60 + (eM || 0);
  if (endMin < startMin) {
    // Overnight task
    endMin += 1440;
  }
  return Math.max(5, endMin - startMin);
}

/**
 * Calculate end time "HH:MM" from start time and duration in minutes
 */
export function calculateEndTimeFromDuration(startTime: string, durationMinutes: number): string {
  if (!startTime) return '';
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h)) return '';
  const totalM = h * 60 + (m || 0) + Math.max(5, durationMinutes);
  const endH = Math.floor((totalM % 1440) / 60);
  const endM = totalM % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Checks if task occurs on the given date (direct date match or recurring rule match)
 */
export function taskOccursOnDate(task: Task, targetDateStr: string): boolean {
  const taskDate = task.date || getTodayDateString(new Date(task.createdAt || Date.now()));
  if (taskDate === targetDateStr) return true;

  if (!task.recurrence || task.recurrence.frequency === 'none') {
    return false;
  }

  // Check if targetDateStr is before the task's base creation date
  if (targetDateStr < taskDate) return false;

  // Check until date if defined
  if (task.recurrence.until && targetDateStr > task.recurrence.until) {
    return false;
  }

  const targetDate = parseDateString(targetDateStr);
  const targetDayOfWeek = targetDate.getDay(); // 0 = Sun ... 6 = Sat

  switch (task.recurrence.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return targetDayOfWeek >= 1 && targetDayOfWeek <= 5;
    case 'weekly': {
      const baseDate = parseDateString(taskDate);
      return targetDayOfWeek === baseDate.getDay();
    }
    case 'custom':
      if (Array.isArray(task.recurrence.daysOfWeek) && task.recurrence.daysOfWeek.length > 0) {
        return task.recurrence.daysOfWeek.includes(targetDayOfWeek);
      }
      return false;
    default:
      return false;
  }
}

/**
 * Check if two time intervals on the same day overlap
 */
export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const [ah, am] = startA.split(':').map(Number);
  const [bh, bm] = endA.split(':').map(Number);
  const [ch, cm] = startB.split(':').map(Number);
  const [dh, dm] = endB.split(':').map(Number);

  const aStart = ah * 60 + am;
  const aEnd = bh * 60 + bm;
  const bStart = ch * 60 + cm;
  const bEnd = dh * 60 + dm;

  return !(aEnd <= bStart || aStart >= bEnd);
}

/**
 * Find all overlapping tasks for a specific date
 * Returns Map: taskId -> list of conflicting task titles
 */
export function findTaskConflictsForDate(tasks: Task[], dateStr: string): Map<string, string[]> {
  const conflicts = new Map<string, string[]>();
  const dayTasks = tasks.filter(t => taskOccursOnDate(t, dateStr) && t.startTime && t.endTime);

  for (let i = 0; i < dayTasks.length; i++) {
    for (let j = i + 1; j < dayTasks.length; j++) {
      const t1 = dayTasks[i];
      const t2 = dayTasks[j];

      if (doIntervalsOverlap(t1.startTime!, t1.endTime!, t2.startTime!, t2.endTime!)) {
        const list1 = conflicts.get(t1.id) || [];
        list1.push(t2.title);
        conflicts.set(t1.id, list1);

        const list2 = conflicts.get(t2.id) || [];
        list2.push(t1.title);
        conflicts.set(t2.id, list2);
      }
    }
  }

  return conflicts;
}

/**
 * Calculate task status: 'completed' | 'in_progress' | 'overdue' | 'pending'
 */
export function getTaskStatus(
  task: Task,
  todayDateStr = getTodayDateString(),
  currentClockStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  activeTimerTaskId?: string | null
): 'completed' | 'in_progress' | 'overdue' | 'pending' {
  if (task.completed) return 'completed';
  if (activeTimerTaskId === task.id) return 'in_progress';

  const taskDate = task.date || todayDateStr;
  if (taskDate < todayDateStr) {
    return 'overdue';
  }
  if (taskDate === todayDateStr && task.endTime && task.endTime < currentClockStr) {
    return 'overdue';
  }

  return 'pending';
}

/**
 * Converts "HH:MM" string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes from midnight to "HH:MM" 24h format
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(normalized / 60) % 24;
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

