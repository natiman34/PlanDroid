import type { Task, Language } from '../types';
import { t } from './i18n';

export const PINNED_PLAN_TAG = 'plandroid-pinned-plan';
export const TIMER_ACTIVE_TAG = 'plandroid-active-timer';
export const TIMER_COMPLETED_TAG = 'plandroid-timer-completed';
export const TASK_REMINDER_TAG = 'plandroid-task-reminder';

export interface NotificationStatus {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
}

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { isSupported: false, permission: 'unsupported' };
  }
  return { isSupported: true, permission: Notification.permission };
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Check if the current time falls inside quiet hours (e.g. "22:00" to "07:00")
 */
export function isQuietHours(startStr = '22:00', endStr = '07:00'): boolean {
  try {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startMins = startH * 60 + (startM || 0);
    const endMins = endH * 60 + (endM || 0);

    if (startMins < endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      // Over midnight, e.g. 22:00 to 07:00
      return currentMins >= startMins || currentMins < endMins;
    }
  } catch {
    return false;
  }
}

/**
 * Pins a plan to the Android / browser notification bar.
 */
export async function pinPlanToNotification(task: Task, lang: Language = 'en'): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }

  if (perm !== 'granted') {
    return false;
  }

  const timeStr = task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : `${task.durationMinutes}m`;
  const title = `PlanDroid: ${task.title}`;
  const body = `⏰ ${timeStr} • ${t('priorityLabel', lang)}: ${t(task.priority as any, lang)}${task.notes ? `\n${task.notes}` : ''}`;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, {
          body,
          tag: PINNED_PLAN_TAG,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: true,
          silent: false,
          data: { taskId: task.id, url: window.location.href },
        });
        return true;
      }
    }

    const notif = new Notification(title, {
      body,
      tag: PINNED_PLAN_TAG,
      icon: '/pwa-192x192.png',
      requireInteraction: true,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.error('Failed to display native notification:', err);
    return false;
  }
}

/**
 * Unpins and clears any active plan notifications from Android notification tray.
 */
export async function unpinPlanNotification(): Promise<void> {
  await closeNotificationByTag(PINNED_PLAN_TAG);
}

/**
 * Shows an active countdown notification while a focus timer is running
 */
export async function showActiveTimerNotification(taskTitle: string, remainingFormatted: string, lang: Language = 'en'): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = `⏱️ ${t('deepFocusTimer', lang)}: ${remainingFormatted}`;
  const body = `${taskTitle} • ${t('focusingStatus', lang)}`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          tag: TIMER_ACTIVE_TAG,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          silent: true,
          requireInteraction: false,
        });
        return;
      }
    }

    new Notification(title, {
      body,
      tag: TIMER_ACTIVE_TAG,
      icon: '/pwa-192x192.png',
      silent: true,
    });
  } catch {
    // ignore
  }
}

/**
 * Displays a persistent completion notification when a focus timer finishes
 */
export async function showTimerCompletionNotification(taskTitle: string, lang: Language = 'en'): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const title = `🔔 ${t('timerFinished', lang)}!`;
  const body = `${t('timerFinishedDesc', lang)}\n🎯 ${taskTitle}`;

  try {
    // Clear active timer tag
    await closeNotificationByTag(TIMER_ACTIVE_TAG);

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && typeof (reg as any).showNotification === 'function') {
        await (reg as any).showNotification(title, {
          body,
          tag: TIMER_COMPLETED_TAG,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: true,
          vibrate: [300, 150, 300, 150, 450],
          data: { url: window.location.href },
        });
        return true;
      }
    }

    const notif = new Notification(title, {
      body,
      tag: TIMER_COMPLETED_TAG,
      icon: '/pwa-192x192.png',
      requireInteraction: true,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.error('Failed to trigger timer completion notification:', err);
    return false;
  }
}

/**
 * Shows an actionable reminder for an unfinished task
 */
export async function showTaskReminderNotification(task: Task, lang: Language = 'en'): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = `⏰ PlanDroid Reminder: ${task.title}`;
  const body = `${t('priorityLabel', lang)}: ${t(task.priority as any, lang)} • ${task.durationMinutes}m\n${t('readyToConquer', lang)}`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          tag: `${TASK_REMINDER_TAG}-${task.id}`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: false,
        });
        return;
      }
    }

    new Notification(title, {
      body,
      tag: `${TASK_REMINDER_TAG}-${task.id}`,
      icon: '/pwa-192x192.png',
    });
  } catch {
    // ignore
  }
}

/**
 * Closes an active notification by tag
 */
export async function closeNotificationByTag(tag: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && typeof reg.getNotifications === 'function') {
        const notifs = await reg.getNotifications({ tag });
        notifs.forEach(n => n.close());
      }
    }
  } catch (err) {
    console.error('Error closing notification:', err);
  }
}
