import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHabitStreak,
  isHabitCompletedOnDate,
  toggleHabitForDate,
  DEFAULT_HABITS,
} from './habitUtils';
import type { Habit } from '../types';

test('isHabitCompletedOnDate checks if date string exists in completedDates', () => {
  const sampleHabit: Habit = {
    id: 'h1',
    title: 'Hydrate',
    category: 'break',
    targetDaysPerWeek: 7,
    completedDates: ['2026-11-01', '2026-11-02'],
    createdAt: Date.now(),
    streak: 2,
    bestStreak: 2,
  };

  assert.equal(isHabitCompletedOnDate(sampleHabit, '2026-11-02'), true);
  assert.equal(isHabitCompletedOnDate(sampleHabit, '2026-11-03'), false);
});

test('calculateHabitStreak correctly counts consecutive active days', () => {
  const fakeToday = '2026-11-02';
  const fakeDate = new Date(2026, 10, 2); // Month is 0-indexed: 10 = Nov

  // Completed today and yesterday
  const result1 = calculateHabitStreak(['2026-11-01', '2026-11-02'], fakeToday, fakeDate);
  assert.equal(result1.currentStreak, 2);
  assert.equal(result1.bestStreak, 2);

  // Completed yesterday but not yet today
  const result2 = calculateHabitStreak(['2026-11-01'], fakeToday, fakeDate);
  assert.equal(result2.currentStreak, 1);

  // No completions
  const result3 = calculateHabitStreak([], fakeToday, fakeDate);
  assert.equal(result3.currentStreak, 0);
  assert.equal(result3.bestStreak, 0);

  // Gap between completions (2026-10-30 and 2026-11-02, missing Oct 31 & Nov 1)
  const result4 = calculateHabitStreak(['2026-10-30', '2026-11-02'], fakeToday, fakeDate);
  assert.equal(result4.currentStreak, 1);
});

test('toggleHabitForDate adds date when missing and removes date when present', () => {
  const fakeToday = '2026-11-02';
  const fakeDate = new Date(2026, 10, 2);

  const habit: Habit = {
    id: 'h-test',
    title: 'Read Books',
    category: 'deep_work',
    targetDaysPerWeek: 5,
    completedDates: ['2026-11-01'],
    createdAt: Date.now(),
    streak: 1,
    bestStreak: 1,
  };

  // Toggle on today
  const updated1 = toggleHabitForDate(habit, '2026-11-02', fakeToday, fakeDate);
  assert.equal(updated1.completedDates.includes('2026-11-02'), true);
  assert.equal(updated1.streak, 2);

  // Toggle off today
  const updated2 = toggleHabitForDate(updated1, '2026-11-02', fakeToday, fakeDate);
  assert.equal(updated2.completedDates.includes('2026-11-02'), false);
  assert.equal(updated2.streak, 1);
});
