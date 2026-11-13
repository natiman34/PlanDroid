import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTodayDateString,
  getWeekDays,
  shiftWeek,
  formatTime,
  calculateDurationFromTimes,
  calculateEndTimeFromDuration,
  taskOccursOnDate,
  doIntervalsOverlap,
  findTaskConflictsForDate,
  getTaskStatus,
} from './dateUtils.ts';
import type { Task } from '../types';

test('getTodayDateString returns YYYY-MM-DD', () => {
  const d = new Date(2026, 9, 27); // Oct 27, 2026
  assert.equal(getTodayDateString(d), '2026-10-27');
});

test('getWeekDays produces 7 days from Monday to Sunday', () => {
  // Oct 27, 2026 is a Tuesday
  const week = getWeekDays('2026-10-27', 1);
  assert.equal(week.length, 7);
  assert.equal(week[0].dayName, 'Monday');
  assert.equal(week[0].dateStr, '2026-10-26');
  assert.equal(week[1].dayName, 'Tuesday');
  assert.equal(week[1].dateStr, '2026-10-27');
  assert.equal(week[6].dayName, 'Sunday');
  assert.equal(week[6].dateStr, '2026-11-01');
});

test('shiftWeek moves back and forward correctly', () => {
  assert.equal(shiftWeek('2026-10-27', 1), '2026-11-03');
  assert.equal(shiftWeek('2026-10-27', -1), '2026-10-20');
});

test('formatTime handles 12h and 24h formats', () => {
  assert.equal(formatTime('09:30', '24h'), '09:30');
  assert.equal(formatTime('09:30', '12h'), '9:30 AM');
  assert.equal(formatTime('13:45', '12h'), '1:45 PM');
  assert.equal(formatTime('00:15', '12h'), '12:15 AM');
  assert.equal(formatTime('12:00', '12h'), '12:00 PM');
});

test('calculateDurationFromTimes and calculateEndTimeFromDuration work reciprocally', () => {
  assert.equal(calculateDurationFromTimes('09:00', '10:30'), 90);
  assert.equal(calculateDurationFromTimes('14:15', '15:00'), 45);
  assert.equal(calculateEndTimeFromDuration('09:00', 90), '10:30');
  assert.equal(calculateEndTimeFromDuration('14:15', 45), '15:00');
});

test('taskOccursOnDate handles direct dates and recurrences', () => {
  const directTask: Task = {
    id: 't1',
    title: 'Single Task',
    category: 'deep_work',
    durationMinutes: 30,
    priority: 'medium',
    energyLevel: 'medium',
    date: '2026-10-27',
    completed: false,
    createdAt: Date.now(),
  };

  assert.equal(taskOccursOnDate(directTask, '2026-10-27'), true);
  assert.equal(taskOccursOnDate(directTask, '2026-10-28'), false);

  const dailyTask: Task = {
    ...directTask,
    id: 't2',
    date: '2026-10-26',
    recurrence: { frequency: 'daily' },
  };
  assert.equal(taskOccursOnDate(dailyTask, '2026-10-27'), true);
  assert.equal(taskOccursOnDate(dailyTask, '2026-10-25'), false); // before start

  const weekdayTask: Task = {
    ...directTask,
    id: 't3',
    date: '2026-10-26', // Mon
    recurrence: { frequency: 'weekdays' },
  };
  assert.equal(taskOccursOnDate(weekdayTask, '2026-10-27'), true); // Tue -> true
  assert.equal(taskOccursOnDate(weekdayTask, '2026-11-01'), false); // Sun -> false
});

test('overlap detection flags colliding intervals', () => {
  assert.equal(doIntervalsOverlap('09:00', '10:00', '09:30', '10:30'), true);
  assert.equal(doIntervalsOverlap('09:00', '10:00', '10:00', '11:00'), false);
  assert.equal(doIntervalsOverlap('11:00', '12:00', '09:00', '10:00'), false);

  const tasks: Task[] = [
    {
      id: 'a',
      title: 'Task A',
      category: 'deep_work',
      durationMinutes: 60,
      priority: 'high',
      energyLevel: 'high',
      date: '2026-10-27',
      startTime: '09:00',
      endTime: '10:00',
      completed: false,
      createdAt: 1,
    },
    {
      id: 'b',
      title: 'Task B',
      category: 'meeting',
      durationMinutes: 45,
      priority: 'medium',
      energyLevel: 'medium',
      date: '2026-10-27',
      startTime: '09:30',
      endTime: '10:15',
      completed: false,
      createdAt: 2,
    },
  ];

  const conflicts = findTaskConflictsForDate(tasks, '2026-10-27');
  assert.equal(conflicts.has('a'), true);
  assert.equal(conflicts.get('a')?.[0], 'Task B');
  assert.equal(conflicts.has('b'), true);
  assert.equal(conflicts.get('b')?.[0], 'Task A');
});

test('getTaskStatus determines status accurately', () => {
  const task: Task = {
    id: 't-stat',
    title: 'Status Test',
    category: 'admin',
    durationMinutes: 30,
    priority: 'low',
    energyLevel: 'low',
    date: '2026-10-27',
    startTime: '08:00',
    endTime: '08:30',
    completed: false,
    createdAt: 1,
  };

  assert.equal(getTaskStatus(task, '2026-10-27', '09:00'), 'overdue');
  assert.equal(getTaskStatus({ ...task, completed: true }, '2026-10-27', '09:00'), 'completed');
  assert.equal(getTaskStatus(task, '2026-10-27', '07:00'), 'pending');
  assert.equal(getTaskStatus(task, '2026-10-27', '08:15', 't-stat'), 'in_progress');
});
