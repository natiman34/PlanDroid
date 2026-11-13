import test from 'node:test';
import assert from 'node:assert/strict';
import {
  timeToMinutes,
  minutesToTime,
  parseNaturalTaskInput,
  autoScheduleTasks,
  calculateDayStats,
  formatHoursMinutes,
  DEFAULT_SCHEDULE_CONFIG
} from './scheduler.ts';
import type { Task } from './scheduler.ts';

test('time conversions work accurately', () => {
  assert.equal(timeToMinutes('00:00'), 0);
  assert.equal(timeToMinutes('09:30'), 570);
  assert.equal(timeToMinutes('14:45'), 885);
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(minutesToTime(885), '14:45');
});

test('parseNaturalTaskInput parses duration, priority and slot accurately', () => {
  const result1 = parseNaturalTaskInput('Finish quarterly security audit 45m urgent morning');
  assert.equal(result1.title, 'Finish quarterly security audit');
  assert.equal(result1.durationMinutes, 45);
  assert.equal(result1.priority, 'urgent');
  assert.equal(result1.preferredSlot, 'morning');

  const result2 = parseNaturalTaskInput('Client check-in call 1.5h high afternoon');
  assert.equal(result2.durationMinutes, 90);
  assert.equal(result2.category, 'meeting');
  assert.equal(result2.priority, 'high');
  assert.equal(result2.preferredSlot, 'afternoon');

  const result3 = parseNaturalTaskInput('Organize inbox emails 20 mins low');
  assert.equal(result3.durationMinutes, 20);
  assert.equal(result3.category, 'admin');
  assert.equal(result3.priority, 'low');
});

test('autoScheduleTasks arranges tasks without overlap and avoids lunch slot', () => {
  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'Architect Database Schema',
      category: 'deep_work',
      durationMinutes: 60,
      priority: 'high',
      energyLevel: 'high',
      preferredSlot: 'morning',
      completed: false,
      createdAt: 1,
    },
    {
      id: 'task-2',
      title: 'Sprint Planning Sync',
      category: 'meeting',
      durationMinutes: 45,
      priority: 'medium',
      energyLevel: 'medium',
      preferredSlot: 'morning',
      completed: false,
      createdAt: 2,
    },
    {
      id: 'task-3',
      title: 'Fixed All-Hands Meeting',
      category: 'meeting',
      durationMinutes: 30,
      priority: 'high',
      energyLevel: 'medium',
      isFixedTime: true,
      startTime: '11:00',
      endTime: '11:30',
      completed: false,
      createdAt: 3,
    }
  ];

  const scheduled = autoScheduleTasks(tasks, DEFAULT_SCHEDULE_CONFIG);

  // Check all tasks have startTime and endTime
  for (const t of scheduled) {
    assert.ok(t.startTime, `Task ${t.title} should have startTime`);
    assert.ok(t.endTime, `Task ${t.title} should have endTime`);
  }

  // Fixed task should maintain 11:00 to 11:30
  const fixed = scheduled.find(t => t.id === 'task-3');
  assert.equal(fixed?.startTime, '11:00');
  assert.equal(fixed?.endTime, '11:30');

  // Verify no task starts during lunch (12:30 - 13:15)
  for (const t of scheduled) {
    const s = timeToMinutes(t.startTime!);
    const e = timeToMinutes(t.endTime!);
    // lunch is 12:30 (750) to 13:15 (795)
    const lunchStart = 750;
    const lunchEnd = 795;
    const collidesWithLunch = !(e <= lunchStart || s >= lunchEnd);
    assert.equal(collidesWithLunch, false, `Task ${t.title} (${t.startTime}-${t.endTime}) should not overlap lunch`);
  }
});

test('calculateDayStats computes correct metrics', () => {
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Done task',
      category: 'deep_work',
      durationMinutes: 60,
      priority: 'high',
      energyLevel: 'high',
      completed: true,
      createdAt: 1,
    },
    {
      id: '2',
      title: 'Pending task',
      category: 'admin',
      durationMinutes: 30,
      priority: 'low',
      energyLevel: 'low',
      completed: false,
      createdAt: 2,
    }
  ];

  const stats = calculateDayStats(sampleTasks);
  assert.equal(stats.total, 2);
  assert.equal(stats.completed, 1);
  assert.equal(stats.remaining, 1);
  assert.equal(stats.totalMinutes, 90);
  assert.equal(stats.completedMinutes, 60);
  assert.equal(stats.percentComplete, 50);
  assert.equal(stats.totalFocusMinutes, 90);
  assert.equal(stats.completedFocusMinutes, 60);
  assert.equal(stats.focusPercent, 67);
  assert.ok(stats.motivationalMessage.includes('Halfway through'));
});

test('formatHoursMinutes formats focus time accurately', () => {
  assert.equal(formatHoursMinutes(0), '0h 0m');
  assert.equal(formatHoursMinutes(-10), '0h 0m');
  assert.equal(formatHoursMinutes(NaN), '0h 0m');
  assert.equal(formatHoursMinutes(45), '0h 45m');
  assert.equal(formatHoursMinutes(60), '1h 0m');
  assert.equal(formatHoursMinutes(90), '1h 30m');
  assert.equal(formatHoursMinutes(155), '2h 35m');
});

test('dynamic progress calculations handle zero, completed, reopened, and deleted tasks safely', () => {
  const calcProgress = (tasksList: { completed: boolean }[]) => {
    const total = tasksList.length;
    const completed = tasksList.filter(t => t.completed).length;
    const raw = total > 0 ? (completed / total) * 100 : 0;
    return Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0;
  };

  // 1. Zero tasks -> 0% (never NaN or Infinity)
  assert.equal(calcProgress([]), 0);

  // 2. 1 of 4 tasks completed -> 25%
  let list = [
    { completed: true },
    { completed: false },
    { completed: false },
    { completed: false },
  ];
  assert.equal(calcProgress(list), 25);

  // 3. Mark another completed -> 50%
  list[1].completed = true;
  assert.equal(calcProgress(list), 50);

  // 4. Mark all completed -> 100%
  list[2].completed = true;
  list[3].completed = true;
  assert.equal(calcProgress(list), 100);

  // 5. Reopened task -> 75%
  list[3].completed = false;
  assert.equal(calcProgress(list), 75);

  // 6. Deleted incomplete task (now 3 of 3 completed) -> 100%
  list.pop();
  assert.equal(calcProgress(list), 100);

  // 7. Reopened all tasks -> 0%
  list.forEach(t => { t.completed = false; });
  assert.equal(calcProgress(list), 0);
});
