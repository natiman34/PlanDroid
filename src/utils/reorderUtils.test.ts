import test from 'node:test';
import assert from 'node:assert/strict';
import type { Task } from '../types';
import {
  getTaskTimelineSegment,
  sortTasksForTimeline,
  reorderTimelineTasks,
  moveTaskStep,
  cycleTaskPriority,
  resetManualTaskOrder,
  hasManualTimelineOrder,
} from './reorderUtils';

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    durationMinutes: 30,
    priority: 'medium',
    energyLevel: 'medium',
    completed: false,
    createdAt: 1000,
    ...overrides,
  };
}

test('getTaskTimelineSegment respects timelineSegment override over startTime', () => {
  const morningByTime = makeTask({ id: '1', title: 'A', startTime: '09:00' });
  const afternoonByTime = makeTask({ id: '2', title: 'B', startTime: '13:30' });
  const eveningByTime = makeTask({ id: '3', title: 'C', startTime: '18:00' });
  const overridden = makeTask({
    id: '4',
    title: 'D',
    startTime: '09:00',
    timelineSegment: 'evening',
  });

  assert.equal(getTaskTimelineSegment(morningByTime), 'morning');
  assert.equal(getTaskTimelineSegment(afternoonByTime), 'afternoon');
  assert.equal(getTaskTimelineSegment(eveningByTime), 'evening');
  assert.equal(getTaskTimelineSegment(overridden), 'evening');
});

test('sortTasksForTimeline prioritizes manualOrder over startTime', () => {
  const t1 = makeTask({ id: '1', title: 'Early', startTime: '09:00', manualOrder: 2 });
  const t2 = makeTask({ id: '2', title: 'Late', startTime: '11:00', manualOrder: 0 });
  const t3 = makeTask({ id: '3', title: 'Mid', startTime: '10:00', manualOrder: 1 });
  const t4 = makeTask({ id: '4', title: 'New', startTime: '08:00' });

  const sorted = sortTasksForTimeline([t1, t2, t3, t4]);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['2', '3', '1', '4']
  );
});

test('reorderTimelineTasks moves task upward and downward within same segment', () => {
  const t1 = makeTask({ id: '1', title: 'First', startTime: '09:00', createdAt: 1 });
  const t2 = makeTask({ id: '2', title: 'Second', startTime: '10:00', createdAt: 2 });
  const t3 = makeTask({ id: '3', title: 'Third', startTime: '11:00', createdAt: 3 });

  // Drag third onto first (moving up -> [3, 1, 2])
  const movedUp = reorderTimelineTasks([t1, t2, t3], '3', '1');
  assert.deepEqual(
    sortTasksForTimeline(movedUp).map((t) => t.id),
    ['3', '1', '2']
  );
  assert.deepEqual(
    sortTasksForTimeline(movedUp).map((t) => t.manualOrder),
    [0, 1, 2]
  );

  // Drag first (now at index 1) downward onto second (index 2) -> [3, 2, 1]
  const movedDown = reorderTimelineTasks(movedUp, '1', '2');
  assert.deepEqual(
    sortTasksForTimeline(movedDown).map((t) => t.id),
    ['3', '2', '1']
  );
});

test('reorderTimelineTasks handles dragging into empty or different segments', () => {
  const t1 = makeTask({ id: '1', title: 'Morning 1', startTime: '09:00', isFixedTime: true });
  const t2 = makeTask({ id: '2', title: 'Morning 2', startTime: '10:00', isFixedTime: true });

  // Drop Morning 1 into empty afternoon segment
  const movedToAfternoon = reorderTimelineTasks([t1, t2], '1', null, 'afternoon');
  const m1 = movedToAfternoon.find((t) => t.id === '1')!;
  assert.equal(getTaskTimelineSegment(m1), 'afternoon');
  assert.equal(m1.timelineSegment, 'afternoon');
  assert.equal(m1.preferredSlot, 'afternoon');

  // Sort order keeps Morning 2 (morning) first, then Morning 1 (moved to afternoon)
  assert.deepEqual(
    sortTasksForTimeline(movedToAfternoon).map((t) => t.id),
    ['2', '1']
  );
});

test('moveTaskStep moves within segment and crosses segment boundaries cleanly', () => {
  const t1 = makeTask({ id: '1', title: 'M1', startTime: '09:00' });
  const t2 = makeTask({ id: '2', title: 'M2', startTime: '10:00' });
  const t3 = makeTask({ id: '3', title: 'A1', startTime: '14:00' });

  // Move M2 up -> swaps with M1 inside morning
  const step1 = moveTaskStep([t1, t2, t3], '2', 'up');
  assert.deepEqual(
    sortTasksForTimeline(step1).map((t) => t.id),
    ['2', '1', '3']
  );
  assert.equal(getTaskTimelineSegment(step1.find((t) => t.id === '1')!), 'morning');

  // Move M1 down (bottom of morning) -> enters afternoon ahead of A1 without kicking A1 out
  const step2 = moveTaskStep(step1, '1', 'down');
  const moved = step2.find((t) => t.id === '1')!;
  const a1 = step2.find((t) => t.id === '3')!;
  assert.equal(getTaskTimelineSegment(moved), 'afternoon');
  assert.equal(getTaskTimelineSegment(a1), 'afternoon');
  assert.deepEqual(
    sortTasksForTimeline(step2).map((t) => t.id),
    ['2', '1', '3']
  );
});

test('cycleTaskPriority cycles through all four priority levels', () => {
  assert.equal(cycleTaskPriority('low'), 'medium');
  assert.equal(cycleTaskPriority('medium'), 'high');
  assert.equal(cycleTaskPriority('high'), 'urgent');
  assert.equal(cycleTaskPriority('urgent'), 'low');
});

test('resetManualTaskOrder clears manualOrder and timelineSegment', () => {
  const t1 = makeTask({ id: '1', title: 'A', startTime: '09:00', manualOrder: 1, timelineSegment: 'evening' });
  const t2 = makeTask({ id: '2', title: 'B', startTime: '10:00', manualOrder: 0 });

  assert.equal(hasManualTimelineOrder([t1, t2]), true);

  const reset = resetManualTaskOrder([t1, t2]);
  assert.equal(hasManualTimelineOrder(reset), false);
  assert.deepEqual(
    sortTasksForTimeline(reset).map((t) => t.id),
    ['1', '2']
  );
});
