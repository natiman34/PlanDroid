import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreak, isDay100PercentComplete } from './streakUtils';
import type { Task } from '../types';

function createMockTask(date: string, completed: boolean, id = Math.random().toString()): Task {
  return {
    id,
    title: `Task for ${date}`,
    date,
    category: 'deep_work',
    durationMinutes: 30,
    priority: 'medium',
    energyLevel: 'medium',
    completed,
    createdAt: Date.now(),
  };
}

test('isDay100PercentComplete returns true only when all tasks are complete', () => {
  const date = '2026-10-27';
  const tasksAllDone = [createMockTask(date, true), createMockTask(date, true)];
  assert.equal(isDay100PercentComplete(tasksAllDone, date).qualified, true);

  const tasksPartial = [createMockTask(date, true), createMockTask(date, false)];
  assert.equal(isDay100PercentComplete(tasksPartial, date).qualified, false);

  const tasksNone = [createMockTask(date, false)];
  assert.equal(isDay100PercentComplete(tasksNone, date).qualified, false);

  assert.equal(isDay100PercentComplete([], date).qualified, false);
});

test('calculateStreak correctly increments for consecutive 100% days', () => {
  const today = '2026-10-27';
  const yesterday = '2026-10-26';
  const twoDaysAgo = '2026-10-25';

  const tasks: Task[] = [
    createMockTask(today, true),
    createMockTask(yesterday, true),
    createMockTask(twoDaysAgo, true),
  ];

  const stats = calculateStreak(tasks, today);
  assert.equal(stats.currentStreak, 3);
  assert.equal(stats.todayCompleted100, true);
  assert.ok(stats.longestStreak >= 3);
});

test('calculateStreak preserves streak when today is not yet finished but yesterday was 100%', () => {
  const today = '2026-10-27';
  const yesterday = '2026-10-26';

  const tasks: Task[] = [
    createMockTask(today, false), // not done yet today
    createMockTask(yesterday, true),
  ];

  const stats = calculateStreak(tasks, today);
  // Today is 0, but yesterday was 1, so streak walking from yesterday gives 1
  assert.equal(stats.currentStreak, 1);
  assert.equal(stats.todayCompleted100, false);
});

test('calculateStreak resets when a past active day had incomplete tasks', () => {
  const today = '2026-10-27';
  const yesterday = '2026-10-26';
  const twoDaysAgo = '2026-10-25';

  const tasks: Task[] = [
    createMockTask(today, true),
    createMockTask(yesterday, false), // missed yesterday!
    createMockTask(twoDaysAgo, true),
  ];

  const stats = calculateStreak(tasks, today);
  // Only today is counted because yesterday broke the streak
  assert.equal(stats.currentStreak, 1);
});
