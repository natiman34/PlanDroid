import type { Task, TaskPriority } from '../types';
import { timeToMinutes } from './scheduler';

export type TimelineSegment = 'morning' | 'afternoon' | 'evening';

/**
 * Resolve which timeline segment a task belongs to.
 * Explicit `timelineSegment` (set by manual drag-and-drop) takes precedence over `startTime`.
 */
export function getTaskTimelineSegment(task: Task): TimelineSegment {
  if (
    task.timelineSegment === 'morning' ||
    task.timelineSegment === 'afternoon' ||
    task.timelineSegment === 'evening'
  ) {
    return task.timelineSegment;
  }

  if (!task.startTime) {
    return 'morning';
  }

  const mins = timeToMinutes(task.startTime);
  if (mins < 720) return 'morning';
  if (mins < 1020) return 'afternoon';
  return 'evening';
}

/**
 * Sort tasks deterministically for the TimelineView.
 * Manually ordered tasks (`manualOrder` defined) always appear in their explicit order first,
 * followed by remaining tasks sorted by `startTime`, then `createdAt`.
 */
export function sortTasksForTimeline(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aHasOrder = typeof a.manualOrder === 'number' && Number.isFinite(a.manualOrder);
    const bHasOrder = typeof b.manualOrder === 'number' && Number.isFinite(b.manualOrder);

    if (aHasOrder && bHasOrder) {
      if (a.manualOrder !== b.manualOrder) {
        return (a.manualOrder as number) - (b.manualOrder as number);
      }
    } else if (aHasOrder) {
      return -1;
    } else if (bHasOrder) {
      return 1;
    }

    if (a.startTime && b.startTime) {
      const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      if (diff !== 0) return diff;
    } else if (a.startTime) {
      return -1;
    } else if (b.startTime) {
      return 1;
    }

    return a.createdAt - b.createdAt;
  });
}

function groupBySegment(tasks: Task[]): Record<TimelineSegment, Task[]> {
  const sorted = sortTasksForTimeline(tasks);
  const groups: Record<TimelineSegment, Task[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  for (const task of sorted) {
    groups[getTaskTimelineSegment(task)].push(task);
  }

  return groups;
}

function finalizeSegmentGroups(groups: Record<TimelineSegment, Task[]>): Task[] {
  const combined = [...groups.morning, ...groups.afternoon, ...groups.evening];
  return combined.map((task, index) => ({
    ...task,
    manualOrder: index,
  }));
}

/**
 * Reorder tasks when `draggedId` is dropped onto `targetId` (or onto an empty `targetSegment`).
 * Assigns clean sequential `manualOrder` indices and updates `timelineSegment` when moving across blocks.
 */
export function reorderTimelineTasks(
  allTasks: Task[],
  draggedId: string,
  targetId: string | null,
  targetSegment?: TimelineSegment
): Task[] {
  const draggedTask = allTasks.find((t) => t.id === draggedId);
  if (!draggedTask) return allTasks;

  if (targetId === draggedId) {
    if (!targetSegment || targetSegment === getTaskTimelineSegment(draggedTask)) {
      return allTasks;
    }
  }

  const origGroups = groupBySegment(allTasks);
  const sourceSegment = getTaskTimelineSegment(draggedTask);

  const targetTask = targetId ? allTasks.find((t) => t.id === targetId) : undefined;
  const destSegment: TimelineSegment =
    targetSegment ?? (targetTask ? getTaskTimelineSegment(targetTask) : sourceSegment);

  const origDestList = origGroups[destSegment];
  const origDraggedIdx = sourceSegment === destSegment
    ? origDestList.findIndex((t) => t.id === draggedId)
    : -1;
  const origTargetIdx = targetId
    ? origDestList.findIndex((t) => t.id === targetId)
    : -1;

  // Remove dragged task from all segment lists
  const nextGroups: Record<TimelineSegment, Task[]> = {
    morning: origGroups.morning.filter((t) => t.id !== draggedId),
    afternoon: origGroups.afternoon.filter((t) => t.id !== draggedId),
    evening: origGroups.evening.filter((t) => t.id !== draggedId),
  };

  const updatedDragged: Task = {
    ...draggedTask,
    timelineSegment: destSegment,
    preferredSlot:
      destSegment !== sourceSegment ? destSegment : draggedTask.preferredSlot,
  };

  const destList = [...nextGroups[destSegment]];

  if (targetId && origTargetIdx !== -1) {
    const newTargetIdx = destList.findIndex((t) => t.id === targetId);
    if (newTargetIdx === -1) {
      destList.push(updatedDragged);
    } else if (origDraggedIdx !== -1 && origDraggedIdx < origTargetIdx) {
      // Dragged downward within the same segment -> place after target
      destList.splice(newTargetIdx + 1, 0, updatedDragged);
    } else {
      // Dragged upward or from another segment -> place before target
      destList.splice(newTargetIdx, 0, updatedDragged);
    }
  } else {
    // Dropped on segment container itself -> append to end of segment
    destList.push(updatedDragged);
  }

  nextGroups[destSegment] = destList;
  return finalizeSegmentGroups(nextGroups);
}

/**
 * Accessible keyboard/button step reorder: move a task one step up or down in the timeline,
 * crossing cleanly into the adjacent segment when at a segment boundary.
 */
export function moveTaskStep(
  allTasks: Task[],
  taskId: string,
  direction: 'up' | 'down'
): Task[] {
  const groups = groupBySegment(allTasks);
  const task = allTasks.find((t) => t.id === taskId);
  if (!task) return allTasks;

  const seg = getTaskTimelineSegment(task);
  const list = [...groups[seg]];
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx === -1) return allTasks;

  if (direction === 'up') {
    if (idx > 0) {
      const [moved] = list.splice(idx, 1);
      list.splice(idx - 1, 0, moved);
      groups[seg] = list;
      return finalizeSegmentGroups(groups);
    }
    if (seg === 'afternoon') {
      list.splice(idx, 1);
      groups.afternoon = list;
      groups.morning = [...groups.morning, { ...task, timelineSegment: 'morning', preferredSlot: 'morning' }];
      return finalizeSegmentGroups(groups);
    }
    if (seg === 'evening') {
      list.splice(idx, 1);
      groups.evening = list;
      groups.afternoon = [...groups.afternoon, { ...task, timelineSegment: 'afternoon', preferredSlot: 'afternoon' }];
      return finalizeSegmentGroups(groups);
    }
    return allTasks;
  } else {
    if (idx < list.length - 1) {
      const [moved] = list.splice(idx, 1);
      list.splice(idx + 1, 0, moved);
      groups[seg] = list;
      return finalizeSegmentGroups(groups);
    }
    if (seg === 'morning') {
      list.splice(idx, 1);
      groups.morning = list;
      groups.afternoon = [{ ...task, timelineSegment: 'afternoon', preferredSlot: 'afternoon' }, ...groups.afternoon];
      return finalizeSegmentGroups(groups);
    }
    if (seg === 'afternoon') {
      list.splice(idx, 1);
      groups.afternoon = list;
      groups.evening = [{ ...task, timelineSegment: 'evening', preferredSlot: 'evening' }, ...groups.evening];
      return finalizeSegmentGroups(groups);
    }
    return allTasks;
  }
}

/**
 * Cycle task priority inline: low -> medium -> high -> urgent -> low
 */
export function cycleTaskPriority(priority: TaskPriority): TaskPriority {
  switch (priority) {
    case 'low':
      return 'medium';
    case 'medium':
      return 'high';
    case 'high':
      return 'urgent';
    case 'urgent':
    default:
      return 'low';
  }
}

/**
 * Clear all manual ordering and explicit segment overrides to return to auto-scheduled time order.
 */
export function resetManualTaskOrder(allTasks: Task[]): Task[] {
  return allTasks.map((task) => {
    const next = { ...task };
    delete next.manualOrder;
    delete next.timelineSegment;
    return next;
  });
}

/**
 * Check if any task currently has custom manual order or segment placement applied.
 */
export function hasManualTimelineOrder(tasks: Task[]): boolean {
  return tasks.some(
    (t) => typeof t.manualOrder === 'number' || t.timelineSegment !== undefined
  );
}
