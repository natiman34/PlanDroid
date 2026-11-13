import type { Task, NotificationSettings, Language } from '../types';
import { getTodayDateString, taskOccursOnDate, timeToMinutes, minutesToTime, formatTime } from './dateUtils';
import { showTaskReminderNotification, isQuietHours } from './notifications';
import { playAlarmSound } from './audio';

export interface TriggeredReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  startTime: string;
  minutesBefore: number;
  message: string;
  timestamp: number;
}

// Keep track of reminders fired during today's session to prevent duplicates
const firedRemindersSet = new Set<string>();

/**
 * Check if any tasks scheduled for today need a reminder alert right now
 */
export function checkTaskReminders(
  tasks: Task[],
  settings: NotificationSettings,
  currentDateStr = getTodayDateString(),
  currentDate = new Date()
): TriggeredReminder[] {
  // If sound/reminders are globally disabled or inside quiet hours, skip
  if (settings.quietHoursEnabled && isQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
    return [];
  }

  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const currentSeconds = currentDate.getSeconds();
  const triggered: TriggeredReminder[] = [];

  for (const task of tasks) {
    if (task.completed || !task.startTime) continue;
    if (!taskOccursOnDate(task, currentDateStr)) continue;

    // Default reminder is 10 min before if enabled, or task.reminderMinutesBefore
    const reminderMinBefore = typeof task.reminderMinutesBefore === 'number'
      ? task.reminderMinutesBefore
      : (task.reminderEnabled ? 10 : null);

    if (reminderMinBefore === null || reminderMinBefore < 0) continue;

    const taskStartMinutes = timeToMinutes(task.startTime);
    const reminderTriggerMinutes = taskStartMinutes - reminderMinBefore;

    // Trigger window: within current minute
    if (currentMinutes === reminderTriggerMinutes) {
      const reminderKey = `${task.id}-${currentDateStr}-${task.startTime}-${reminderMinBefore}`;
      if (!firedRemindersSet.has(reminderKey)) {
        firedRemindersSet.add(reminderKey);

        const timeFormatted = formatTime(task.startTime, '24h');
        const minText = reminderMinBefore === 0
          ? 'starting now'
          : `starts in ${reminderMinBefore} minute${reminderMinBefore === 1 ? '' : 's'}`;

        triggered.push({
          id: reminderKey,
          taskId: task.id,
          taskTitle: task.title,
          startTime: task.startTime,
          minutesBefore: reminderMinBefore,
          message: `⏰ "${task.title}" ${minText} (${timeFormatted})`,
          timestamp: Date.now(),
        });
      }
    }
  }

  return triggered;
}

/**
 * Snooze a reminder for 5 minutes
 */
export function snoozeReminder(reminder: TriggeredReminder, snoozeMinutes = 5): void {
  const futureTime = Date.now() + snoozeMinutes * 60 * 1000;
  // Clear the reminder key from fired set after snooze expires
  setTimeout(() => {
    firedRemindersSet.delete(reminder.id);
  }, snoozeMinutes * 60 * 1000);
}
