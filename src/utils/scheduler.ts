import type { Task, WorkScheduleConfig } from '../types';
export type { Task, WorkScheduleConfig };

export const DEFAULT_SCHEDULE_CONFIG: WorkScheduleConfig = {
  workStart: '09:00',
  workEnd: '17:30',
  bufferMinutes: 10,
  lunchStart: '12:30',
  lunchDuration: 45,
  timeFormat: '24h',
  weekStartsOn: 1,
  defaultTaskDuration: 30,
  defaultReminderMinutes: 10,
  defaultFocusDuration: 25,
  defaultBreakDuration: 5,
  dailyGoalMinutes: 240,
  weeklyGoalMinutes: 1200,
};

// Helper to convert "HH:MM" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper to convert minutes from midnight to "HH:MM"
export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Natural language offline parser for task suggestions
export function parseNaturalTaskInput(input: string): Partial<Task> {
  const trimmed = input.trim();
  if (!trimmed) return {};

  let durationMinutes = 30; // default
  let priority: Task['priority'] = 'medium';
  let energyLevel: Task['energyLevel'] = 'medium';
  let category: Task['category'] = 'deep_work';
  let preferredSlot: Task['preferredSlot'] = 'any';

  // Duration detection: e.g. "45m", "45 mins", "1h", "1.5h", "90 min"
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minMatch = trimmed.match(/(\d+)\s*(?:mins?|minutes?|m)\b/i);

  if (hourMatch) {
    durationMinutes = Math.round(parseFloat(hourMatch[1]) * 60);
  } else if (minMatch) {
    durationMinutes = parseInt(minMatch[1], 10);
  }

  // Priority detection
  if (/\b(urgent|asap|critical|highest|p0)\b/i.test(trimmed)) {
    priority = 'urgent';
    energyLevel = 'high';
  } else if (/\b(high|important|crucial|p1)\b/i.test(trimmed)) {
    priority = 'high';
    energyLevel = 'high';
  } else if (/\b(low|minor|casual|someday|p3)\b/i.test(trimmed)) {
    priority = 'low';
    energyLevel = 'low';
  }

  // Preferred slot detection
  if (/\b(morning|am|early)\b/i.test(trimmed)) {
    preferredSlot = 'morning';
  } else if (/\b(afternoon|pm|midday)\b/i.test(trimmed)) {
    preferredSlot = 'afternoon';
  } else if (/\b(evening|night|late)\b/i.test(trimmed)) {
    preferredSlot = 'evening';
  }

  // Category detection
  if (/\b(meeting|call|sync|standup|1:1|catchup|interview)\b/i.test(trimmed)) {
    category = 'meeting';
    energyLevel = 'medium';
  } else if (/\b(email|inbox|slack|invoice|ticket|admin|filing|expense)\b/i.test(trimmed)) {
    category = 'admin';
    energyLevel = 'low';
  } else if (/\b(review|pr|audit|check|proofread)\b/i.test(trimmed)) {
    category = 'review';
  } else if (/\b(break|walk|coffee|lunch|stretch|rest)\b/i.test(trimmed)) {
    category = 'break';
    energyLevel = 'low';
  } else if (/\b(personal|gym|workout|doctor|meditate)\b/i.test(trimmed)) {
    category = 'personal';
  }

  // Clean title by stripping matched tags
  let cleanTitle = trimmed
    .replace(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/gi, '')
    .replace(/\b(\d+)\s*(?:mins?|minutes?|m)\b/gi, '')
    .replace(/\b(urgent|asap|critical|highest|p0|p1|p3|high|low|morning|afternoon|evening)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleanTitle) {
    cleanTitle = trimmed;
  }

  return {
    title: cleanTitle,
    durationMinutes: Math.max(10, Math.min(360, durationMinutes)),
    priority,
    energyLevel,
    category,
    preferredSlot,
  };
}

// Auto-schedule task list without time collisions
export function autoScheduleTasks(
  tasks: Task[],
  config: WorkScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): Task[] {
  const workStartMin = timeToMinutes(config.workStart);
  const workEndMin = timeToMinutes(config.workEnd);
  const lunchStartMin = timeToMinutes(config.lunchStart);
  const lunchEndMin = lunchStartMin + config.lunchDuration;

  // Reserved intervals [start, end]
  const reservedIntervals: Array<{ start: number; end: number; taskId?: string }> = [
    { start: lunchStartMin, end: lunchEndMin, taskId: 'lunch' }
  ];

  // First, lock in fixed time tasks
  const fixedTasks = tasks.filter(t => t.isFixedTime && t.startTime && t.endTime);
  for (const t of fixedTasks) {
    const s = timeToMinutes(t.startTime!);
    const e = timeToMinutes(t.endTime!);
    reservedIntervals.push({ start: s, end: e, taskId: t.id });
  }

  reservedIntervals.sort((a, b) => a.start - b.start);

  // Separate non-fixed tasks
  const dynamicTasks = tasks.filter(t => !t.isFixedTime || !t.startTime || !t.endTime);

  // Priority score helper
  const priorityScore = (p: Task['priority']) => {
    switch (p) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  };

  // Energy/slot weighting
  const sortedDynamic = [...dynamicTasks].sort((a, b) => {
    // completed tasks at the bottom
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // higher priority first
    const pDiff = priorityScore(b.priority) - priorityScore(a.priority);
    if (pDiff !== 0) return pDiff;
    // deep work preferred in morning
    if (a.preferredSlot === 'morning' && b.preferredSlot !== 'morning') return -1;
    if (b.preferredSlot === 'morning' && a.preferredSlot !== 'morning') return 1;
    return a.createdAt - b.createdAt;
  });

  const scheduledMap = new Map<string, { start: string; end: string }>();

  for (const task of sortedDynamic) {
    if (task.completed && task.startTime && task.endTime) {
      // keep already completed task's slot
      scheduledMap.set(task.id, { start: task.startTime, end: task.endTime });
      reservedIntervals.push({
        start: timeToMinutes(task.startTime),
        end: timeToMinutes(task.endTime),
        taskId: task.id
      });
      reservedIntervals.sort((a, b) => a.start - b.start);
      continue;
    }

    const duration = task.durationMinutes;
    const buffer = task.category === 'deep_work' ? config.bufferMinutes : Math.min(5, config.bufferMinutes);

    // Preferred slot minimum starting minute
    let searchStart = workStartMin;
    if (task.preferredSlot === 'afternoon') {
      searchStart = Math.max(workStartMin, lunchEndMin);
    } else if (task.preferredSlot === 'evening') {
      searchStart = Math.max(workStartMin, timeToMinutes('16:00'));
    }

    let allocatedStart: number | null = null;
    let cursor = searchStart;

    while (cursor + duration <= workEndMin + 120) { // allow small overtime if needed
      // check if interval [cursor, cursor + duration] collides with reserved
      const hasCollision = reservedIntervals.some(interval => {
        return !(cursor + duration <= interval.start || cursor >= interval.end);
      });

      if (!hasCollision) {
        allocatedStart = cursor;
        break;
      }

      // Step cursor to the end of colliding interval
      const colliding = reservedIntervals.find(interval => {
        return !(cursor + duration <= interval.start || cursor >= interval.end);
      });

      if (colliding) {
        cursor = colliding.end + buffer;
      } else {
        cursor += 15;
      }
    }

    if (allocatedStart === null) {
      // Fallback: append after latest reserved interval
      const latestEnd = reservedIntervals.reduce((max, r) => Math.max(max, r.end), workStartMin);
      allocatedStart = latestEnd + buffer;
    }

    const allocatedEnd = allocatedStart + duration;
    scheduledMap.set(task.id, {
      start: minutesToTime(allocatedStart),
      end: minutesToTime(allocatedEnd),
    });

    reservedIntervals.push({
      start: allocatedStart,
      end: allocatedEnd,
      taskId: task.id
    });
    reservedIntervals.sort((a, b) => a.start - b.start);
  }

  // Construct return list preserving order
  return tasks.map(t => {
    if (t.isFixedTime && t.startTime && t.endTime) {
      return t;
    }
    const allocated = scheduledMap.get(t.id);
    if (allocated) {
      return {
        ...t,
        startTime: allocated.start,
        endTime: allocated.end,
      };
    }
    return t;
  });
}

// Rebalance remaining day from a reference time (e.g., current time "14:15")
export function rebalanceRemainingDay(
  tasks: Task[],
  currentTime: string,
  config: WorkScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): Task[] {
  const currentMin = timeToMinutes(currentTime);

  // Completed tasks remain unchanged
  // Incomplete tasks scheduled before current time are shifted forward
  const needsReschedule = tasks.filter(t => !t.completed && !t.isFixedTime);
  const lockedTasks = tasks.filter(t => t.completed || t.isFixedTime);

  // Update schedule config to start at max(workStart, currentMin + 5)
  const adjustedConfig: WorkScheduleConfig = {
    ...config,
    workStart: minutesToTime(Math.max(timeToMinutes(config.workStart), currentMin + 5)),
  };

  return autoScheduleTasks([...lockedTasks, ...needsReschedule], adjustedConfig);
}

// Calculate summary metrics including focus time and daily goals
export function calculateDayStats(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const totalDuration = tasks.reduce((acc, t) => acc + t.durationMinutes, 0);
  const completedDuration = tasks.filter(t => t.completed).reduce((acc, t) => acc + t.durationMinutes, 0);

  // Focus tasks include deep work and review (or all work excluding pure breaks/personal)
  const isFocusTask = (t: Task) => t.category === 'deep_work' || t.category === 'review' || t.category === 'admin';
  const totalFocusMinutes = tasks.filter(isFocusTask).reduce((acc, t) => acc + t.durationMinutes, 0);
  const completedFocusMinutes = tasks.filter(t => t.completed && isFocusTask(t)).reduce((acc, t) => acc + t.durationMinutes, 0);
  const deepWorkMinutes = tasks.filter(t => t.category === 'deep_work').reduce((acc, t) => acc + t.durationMinutes, 0);

  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
  const focusPercent = totalFocusMinutes > 0 ? Math.round((completedFocusMinutes / totalFocusMinutes) * 100) : (total > 0 ? percentComplete : 0);
  const focusScore = Math.min(100, Math.round((deepWorkMinutes / Math.max(1, totalDuration)) * 100));

  let motivationalMessage = "Ready to conquer the day? Kick off your first focus block!";
  if (percentComplete === 100 && total > 0) {
    motivationalMessage = "Goal Achieved! You've completed 100% of today's plan. Fantastic job!";
  } else if (percentComplete >= 75) {
    motivationalMessage = "Final stretch! You're dominating today's schedule—keep the momentum!";
  } else if (percentComplete >= 50) {
    motivationalMessage = "Halfway through! Great focus and steady progress today.";
  } else if (percentComplete > 0) {
    motivationalMessage = "Solid momentum! First goals cleared—keep rolling!";
  }

  return {
    total,
    completed,
    remaining: total - completed,
    totalMinutes: totalDuration,
    completedMinutes: completedDuration,
    totalFocusMinutes,
    completedFocusMinutes,
    remainingFocusMinutes: Math.max(0, totalFocusMinutes - completedFocusMinutes),
    percentComplete,
    focusPercent,
    focusScore,
    motivationalMessage,
  };
}

/**
 * Format total minutes as hours and minutes (e.g. "1h 30m" or "0h 45m" or "0h 0m")
 */
export function formatHoursMinutes(totalMinutes: number): string {
  if (!totalMinutes || !Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return '0h 0m';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

