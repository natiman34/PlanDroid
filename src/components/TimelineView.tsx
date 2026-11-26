import React, { useState, useRef } from 'react';
import type { Task, TaskCategory, FocusSession, Language } from '../types';
import {
  Clock,
  CheckCircle2,
  Circle,
  Timer,
  Trash2,
  Search,
  Coffee,
  Briefcase,
  Code,
  Users,
  CheckCheck,
  Calendar,
  Lock,
  Plus,
  Pencil,
  Bell,
  CalendarPlus,
  Zap,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSuccess } from '../utils/audio';
import { DailyGoalSummary } from './DailyGoalSummary';
import { HabitsTracker } from './HabitsTracker';
import { t } from '../utils/i18n';
import type { Habit } from '../types';
import {
  type CustomCategory,
  getTaskCategory,
  getCategoryBadgeStyle,
} from '../utils/categoryUtils';
import {
  type TimelineSegment,
  getTaskTimelineSegment,
  sortTasksForTimeline,
  reorderTimelineTasks,
  moveTaskStep,
  resetManualTaskOrder,
  hasManualTimelineOrder,
} from '../utils/reorderUtils';

interface TimelineViewProps {
  tasks: Task[];
  habits?: Habit[];
  onUpdateHabits?: (habits: Habit[]) => void;
  categories?: CustomCategory[];
  focusSessions?: FocusSession[];
  dailyGoalMinutes?: number;
  onUpdateDailyGoal?: (mins: number) => void;
  lang?: Language;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onPinAsActive: (taskId: string) => void;
  onOpenFocusModal: (task: Task) => void;
  onClearCompleted?: () => void;
  onCreatePlan: () => void;
  onEditPlan?: (task: Task) => void;
  onSetupQuickAction?: (title: string, duration: number, category: TaskCategory) => void;
  onReorderTasks?: (tasks: Task[]) => void;
  onCyclePriority?: (taskId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  tasks = [],
  habits = [],
  onUpdateHabits,
  categories = [],
  focusSessions = [],
  dailyGoalMinutes = 240,
  onUpdateDailyGoal,
  lang = 'en',
  onToggleComplete,
  onDeleteTask,
  onPinAsActive,
  onOpenFocusModal,
  onClearCompleted,
  onCreatePlan,
  onEditPlan,
  onSetupQuickAction,
  onReorderTasks,
  onCyclePriority,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Drag-to-reorder state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverSegment, setDragOverSegment] = useState<TimelineSegment | null>(null);
  const touchDraggedIdRef = useRef<string | null>(null);

  // Active task for starting focus from the goal widget
  const activeTask = tasks.find(t => !t.completed && t.startTime);

  // Trigger confetti burst on completion
  const handleCheck = (taskId: string, isNowCompleted: boolean) => {
    if (!isNowCompleted) {
      playSuccess();
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }
    }
    onToggleComplete(taskId);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory !== 'all' && t.category !== selectedCategory) {
      return false;
    }
    if (filterPriority !== 'all' && t.priority !== filterPriority) {
      return false;
    }
    return true;
  });

  // Sort using manualOrder first when present, then startTime / createdAt
  const sortedTasks = sortTasksForTimeline(filteredTasks);

  // Split into Morning, Afternoon, Evening (honoring manual timelineSegment override)
  const morningTasks = sortedTasks.filter(t => getTaskTimelineSegment(t) === 'morning');
  const afternoonTasks = sortedTasks.filter(t => getTaskTimelineSegment(t) === 'afternoon');
  const eveningTasks = sortedTasks.filter(t => getTaskTimelineSegment(t) === 'evening');

  const isManuallyOrdered = hasManualTimelineOrder(tasks);

  const clearDragState = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverSegment(null);
    touchDraggedIdRef.current = null;
  };

  const applyDrop = (dragId: string, targetTaskId: string | null, segment?: TimelineSegment) => {
    if (!onReorderTasks || !dragId) return;
    const updated = reorderTimelineTasks(tasks, dragId, targetTaskId, segment);
    onReorderTasks(updated);
  };

  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', taskId);
    } catch {
      // ignore if restricted
    }
  };

  const handleTaskDragOver = (e: React.DragEvent, targetId: string, segment: TimelineSegment) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTaskId !== targetId) setDragOverTaskId(targetId);
    if (dragOverSegment !== segment) setDragOverSegment(segment);
  };

  const handleTaskDrop = (e: React.DragEvent, targetId: string, segment: TimelineSegment) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (dragId && dragId !== targetId) {
      applyDrop(dragId, targetId, segment);
    }
    clearDragState();
  };

  const handleSegmentDragOver = (e: React.DragEvent, segment: TimelineSegment) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSegment !== segment) setDragOverSegment(segment);
  };

  const handleSegmentDrop = (e: React.DragEvent, segment: TimelineSegment) => {
    e.preventDefault();
    const dragId = draggedTaskId || e.dataTransfer.getData('text/plain');
    if (dragId) {
      applyDrop(dragId, null, segment);
    }
    clearDragState();
  };

  // Mobile Touch Drag support
  const handleTouchStartGrip = (taskId: string) => {
    if (!onReorderTasks) return;
    touchDraggedIdRef.current = taskId;
    setDraggedTaskId(taskId);
  };

  const handleTouchMoveGrip = (e: React.TouchEvent) => {
    const dragId = touchDraggedIdRef.current;
    if (!dragId || e.touches.length === 0) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    if (!el) return;

    const cardEl = el.closest('[data-task-id]') as HTMLElement | null;
    const segEl = el.closest('[data-segment]') as HTMLElement | null;

    if (cardEl) {
      const hoveredId = cardEl.getAttribute('data-task-id');
      if (hoveredId && hoveredId !== dragId) {
        setDragOverTaskId(hoveredId);
      }
    } else {
      setDragOverTaskId(null);
    }

    if (segEl) {
      const hoveredSeg = segEl.getAttribute('data-segment') as TimelineSegment | null;
      if (hoveredSeg) {
        setDragOverSegment(hoveredSeg);
      }
    }
  };

  const handleTouchEndGrip = (e: React.TouchEvent) => {
    const dragId = touchDraggedIdRef.current;
    if (!dragId) {
      clearDragState();
      return;
    }

    const touch = e.changedTouches[0];
    if (touch) {
      const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      const cardEl = el?.closest('[data-task-id]') as HTMLElement | null;
      const segEl = el?.closest('[data-segment]') as HTMLElement | null;

      const targetId = cardEl?.getAttribute('data-task-id') || null;
      const targetSeg = (segEl?.getAttribute('data-segment') as TimelineSegment | null) || undefined;

      if (targetId && targetId !== dragId) {
        applyDrop(dragId, targetId, targetSeg);
      } else if (targetSeg) {
        applyDrop(dragId, null, targetSeg);
      }
    }
    clearDragState();
  };

  const handleStepMove = (taskId: string, direction: 'up' | 'down') => {
    if (!onReorderTasks) return;
    onReorderTasks(moveTaskStep(tasks, taskId, direction));
  };

  const handleResetOrder = () => {
    if (!onReorderTasks) return;
    onReorderTasks(resetManualTaskOrder(tasks));
  };

  const completedCount = tasks.filter(t => t.completed).length;

  const renderTaskCard = (task: Task, segment: TimelineSegment, indexInTimeline: number, totalCount: number) => {
    const isDragging = draggedTaskId === task.id;
    const isDragTarget = dragOverTaskId === task.id && draggedTaskId !== task.id;
    const canReorder = Boolean(onReorderTasks);

    const cat = getTaskCategory(task, categories);
    const badgeStyle = getCategoryBadgeStyle(cat.color);

    return (
      <div
        key={task.id}
        data-task-id={task.id}
        data-testid={`timeline-task-${task.id}`}
        draggable={canReorder}
        onDragStart={(e) => handleTaskDragStart(e, task.id)}
        onDragOver={(e) => handleTaskDragOver(e, task.id, segment)}
        onDrop={(e) => handleTaskDrop(e, task.id, segment)}
        onDragEnd={clearDragState}
        className={`group relative rounded-lg border p-3 transition-all duration-200 ${
          isDragging
            ? 'opacity-50 scale-[0.98] border-blue-500/70 bg-surface-elevated shadow-xl'
            : isDragTarget
            ? 'border-blue-500 ring-1 ring-blue-500/40 bg-surface-hover shadow-lg'
            : task.completed
            ? 'bg-surface-hover border-border-default opacity-60'
            : 'bg-surface-panel border-border-default hover:border-border-focused hover:shadow-md'
        }`}
      >
        <div className="flex items-start gap-2 sm:gap-2.5">
          {/* Drag Grip Handle + Step Controls */}
          {canReorder && (
            <div className="flex flex-col items-center gap-0.5 shrink-0 select-none">
              <div
                onTouchStart={() => handleTouchStartGrip(task.id)}
                onTouchMove={handleTouchMoveGrip}
                onTouchEnd={handleTouchEndGrip}
                aria-label={`Drag to reorder ${task.title}`}
                title="Drag to reorder plan"
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-grab active:cursor-grabbing touch-none transition"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleStepMove(task.id, 'up')}
                  disabled={indexInTimeline === 0}
                  aria-label={`Move ${task.title} up`}
                  title="Move up"
                  className="p-1 rounded text-text-muted hover:text-blue-400 hover:bg-surface-hover disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepMove(task.id, 'down')}
                  disabled={indexInTimeline === totalCount - 1}
                  aria-label={`Move ${task.title} down`}
                  title="Move down"
                  className="p-1 rounded text-text-muted hover:text-blue-400 hover:bg-surface-hover disabled:opacity-25 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Completion Checkbox */}
          <button
            type="button"
            onClick={() => handleCheck(task.id, task.completed)}
            aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
            className="mt-0.5 text-text-muted hover:text-emerald-400 transition cursor-pointer shrink-0"
          >
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
            ) : (
              <Circle className="w-5 h-5 text-text-muted group-hover:text-slate-300" />
            )}
          </button>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              {/* Scheduled timing pill */}
              <span className="font-mono text-[10px] font-semibold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : `${task.durationMinutes}m`}
              </span>

              {/* Fixed time badge */}
              {task.isFixedTime && (
                <span className="text-[10px] text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-500/40 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  Fixed
                </span>
              )}

              {/* Priority pill */}
              {onCyclePriority ? (
                <button
                  type="button"
                  onClick={() => onCyclePriority(task.id)}
                  aria-label={`Change priority for ${task.title}, currently ${task.priority}`}
                  title="Click to cycle priority"
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded transition cursor-pointer hover:brightness-110 active:scale-95 ${
                    task.priority === 'urgent' ? 'bg-rose-900 text-rose-300 border border-rose-800/60' :
                    task.priority === 'high' ? 'bg-amber-900 text-amber-300 border border-amber-800/60' :
                    task.priority === 'medium' ? 'bg-blue-900 text-blue-300 border border-blue-800/40' :
                    'bg-surface-hover text-text-muted border border-border-default'
                  }`}
                >
                  {task.priority}
                </button>
              ) : (
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  task.priority === 'urgent' ? 'bg-rose-900 text-rose-300 border border-rose-800/50' :
                  task.priority === 'high' ? 'bg-amber-900 text-amber-300 border border-amber-800/50' :
                  'bg-surface-hover text-text-muted border border-border-default'
                }`}>
                  {task.priority}
                </span>
              )}

              {/* Category tag */}
              <span
                className="text-[10px] font-semibold flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition"
                style={badgeStyle}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="truncate max-w-[100px]">{cat.name}</span>
              </span>
            </div>

            <h4 className={`text-sm font-semibold tracking-tight text-text-primary ${
              task.completed ? 'line-through text-text-muted' : ''
            }`}>
              {task.title}
            </h4>

            {task.notes && (
              <p className="text-xs text-text-muted mt-1 line-clamp-2">{task.notes}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {!task.completed && (
              <>
                <button
                  type="button"
                  onClick={() => onPinAsActive(task.id)}
                  aria-label={`Show ${task.title} in notification bar`}
                  className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-surface-hover transition cursor-pointer"
                  title="Show in Notification Bar"
                >
                  <Bell className="w-4 h-4 text-blue-400" />
                </button>

                {onEditPlan && (
                  <button
                    type="button"
                    onClick={() => onEditPlan(task)}
                    aria-label={`Edit plan ${task.title}`}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                    title="Edit Plan"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenFocusModal(task)}
                  aria-label={`Open Focus Timer for ${task.title}`}
                  className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-surface-hover transition cursor-pointer"
                  title="Launch Focus Timer"
                >
                  <Timer className="w-4 h-4 text-emerald-400" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              aria-label={`Delete plan ${task.title}`}
              className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-900/30 transition cursor-pointer"
              title="Delete Plan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* DailyGoalSummary ALWAYS at top of TimelineView */}
      <DailyGoalSummary
        tasks={tasks}
        focusSessions={focusSessions}
        dailyGoalMinutes={dailyGoalMinutes}
        onUpdateDailyGoal={onUpdateDailyGoal}
        lang={lang}
        onOpenActiveFocus={activeTask ? () => onOpenFocusModal(activeTask) : undefined}
      />

      {/* Daily Habits & Routines Tracking */}
      {onUpdateHabits && (
        <HabitsTracker
          habits={habits}
          onUpdateHabits={onUpdateHabits}
          lang={lang}
        />
      )}

      {/* Empty State */}
      {tasks.length === 0 ? (
        <div className="text-center py-14 px-6 rounded-xl border-2 border-dashed border-border-default bg-surface-elevated/30 space-y-4 animatefadein duration-200">
          <div className="w-16 h-16 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
            <CalendarPlus className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">{t('noPlansYet', lang)}</h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto leading-relaxed">
              {t('noPlansDesc', lang)}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onCreatePlan()}
              className="px-6 py-3 btnprimary text-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('createPlan', lang)}</span>
            </button>
          </div>

          {onSetupQuickAction && (
            <div className="pt-4 border-t border-border-default max-w-sm mx-auto">
              <span className="text-[10px] text-text-muted block mb-2 font-medium">
                {t('quickStartWith', lang)}
              </span>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onSetupQuickAction('Deep Work Session', 45, 'deep_work')}
                  className="btnsecondary text-[11px]"
                >
                  {t('quickDeepWork', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => onSetupQuickAction('Team Sync / Call', 30, 'meeting')}
                  className="btnsecondary text-[11px]"
                >
                  {t('quickSync', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => onSetupQuickAction('Coffee Recharge', 15, 'break')}
                  className="btnsecondary text-[11px]"
                >
                  {t('quickBreak', lang)}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Header bar with Search, Filters, and Create Plan Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlansPlaceholder', lang)}
                className="fieldinput pl-9 text-[11px]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="fieldselect text-[11px]"
              >
                <option value="all">{t('allCategories', lang)}</option>
                <option value="deep_work">Deep Work</option>
                <option value="meeting">Meetings</option>
                <option value="review">Reviews</option>
                <option value="break">Breaks</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="fieldselect text-[11px]"
              >
                <option value="all">{t('allPriorities', lang)}</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {onReorderTasks && isManuallyOrdered && (
                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="btnsecondary text-[11px] flex items-center gap-1 whitespace-nowrap"
                  title="Reset manual drag-and-drop order back to scheduled times"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Order</span>
                </button>
              )}

              {onClearCompleted && completedCount > 0 && (
                <button
                  type="button"
                  onClick={onClearCompleted}
                  className="btnghost text-[11px] hover:text-rose-400 hover:bg-rose-900/30 whitespace-nowrap"
                  title="Remove all completed plans from schedule"
                >
                  {t('clearCompleted', lang)} ({completedCount})
                </button>
              )}

              <button
                type="button"
                onClick={() => onCreatePlan()}
                className="btnprimary text-[11px] flex items-center gap-1.5 ml-auto whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('createPlan', lang)}</span>
              </button>
            </div>
          </div>

          {/* Quick-Start Timer Action Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[10px] text-text-muted font-medium whitespace-nowrap flex items-center gap-1 shrink-0">
              <Zap className="w-3 h-3 text-amber-400" />
              {t('quickStartWith', lang)}
            </span>
            <button
              type="button"
              onClick={() => {
                if (onSetupQuickAction) onSetupQuickAction('Deep Work Session', 45, 'deep_work');
              }}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary text-[11px] font-medium border border-border-default hover:border-indigo-500/50 transition cursor-pointer whitespace-nowrap active:scale-[0.97] flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>+45m Deep Work</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSetupQuickAction) onSetupQuickAction('Team Sync / Call', 30, 'meeting');
              }}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary text-[11px] font-medium border border-border-default hover:border-blue-500/50 transition cursor-pointer whitespace-nowrap active:scale-[0.97] flex items-center gap-1"
            >
              <Users className="w-3 h-3 text-blue-400" />
              <span>+30m Team Sync</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSetupQuickAction) onSetupQuickAction('Coffee Recharge', 15, 'break');
              }}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary text-[11px] font-medium border border-border-default hover:border-emerald-500/50 transition cursor-pointer whitespace-nowrap active:scale-[0.97] flex items-center gap-1"
            >
              <Coffee className="w-3 h-3 text-emerald-400" />
              <span>+15m Break</span>
            </button>
          </div>

          {/* Timeline Segments */}
          {sortedTasks.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border-2 border-dashed border-border-default bg-surface-elevated/30">
              <Calendar className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-text-secondary">No matching plans</h4>
              <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                Try adjusting your search query or filter.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {(() => {
                  const flattenedTimeline = [...morningTasks, ...afternoonTasks, ...eveningTasks];
                  const indexMap = new Map(flattenedTimeline.map((item, i) => [item.id, i]));
                  const totalTimelineCount = flattenedTimeline.length;
                  return (
                    <>
                    {(morningTasks.length > 0 || draggedTaskId !== null) && (
                      <div
                        data-segment="morning"
                        onDragOver={(e) => handleSegmentDragOver(e, 'morning')}
                        onDrop={(e) => handleSegmentDrop(e, 'morning')}
                        className={`transition-colors rounded-xl p-2 -m-2 ${
                          dragOverSegment === 'morning' && draggedTaskId
                            ? 'bg-blue-900/20 ring-1 ring-blue-500/50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            {t('morningBlock', lang)}
                          </h3>
                          <span className="text-[10px] text-text-muted">({morningTasks.length} {t('plansPlural', lang)})</span>
                        </div>
                        <div className="space-y-2.5 border-l-2 border-border-default pl-3 ml-1 min-h-[36px]">
                          {morningTasks.length > 0 ? (
                            morningTasks.map((task) =>
                              renderTaskCard(task, 'morning', indexMap.get(task.id) ?? 0, totalTimelineCount)
                            )
                          ) : (
                            <div className="py-4 px-3 rounded-lg border border-dashed border-border-default text-[10px] text-text-muted text-center">
                              Drop plan here to schedule in Morning block
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lunch Interval Highlight */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-emerald-500/50 bg-emerald-900/10 text-[10px] text-emerald-400 font-medium">
                      <Coffee className="w-3 h-3 text-emerald-400" />
                      <span>{t('optimalLunchWindow', lang)}</span>
                    </div>

                    {/* Afternoon Segment */}
                    {(afternoonTasks.length > 0 || draggedTaskId !== null) && (
                      <div
                        data-segment="afternoon"
                        onDragOver={(e) => handleSegmentDragOver(e, 'afternoon')}
                        onDrop={(e) => handleSegmentDrop(e, 'afternoon')}
                        className={`transition-colors rounded-xl p-2 -m-2 ${
                          dragOverSegment === 'afternoon' && draggedTaskId
                            ? 'bg-blue-900/20 ring-1 ring-blue-500/50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            {t('afternoonBlock', lang)}
                          </h3>
                          <span className="text-[10px] text-text-muted">({afternoonTasks.length} {t('plansPlural', lang)})</span>
                        </div>
                        <div className="space-y-2.5 border-l-2 border-border-default pl-3 ml-1 min-h-[36px]">
                          {afternoonTasks.length > 0 ? (
                            afternoonTasks.map((task) =>
                              renderTaskCard(task, 'afternoon', indexMap.get(task.id) ?? 0, totalTimelineCount)
                            )
                          ) : (
                            <div className="py-4 px-3 rounded-lg border border-dashed border-border-default text-[10px] text-text-muted text-center">
                              Drop plan here to schedule in Afternoon block
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Evening Segment */}
                    {(eveningTasks.length > 0 || draggedTaskId !== null) && (
                      <div
                        data-segment="evening"
                        onDragOver={(e) => handleSegmentDragOver(e, 'evening')}
                        onDrop={(e) => handleSegmentDrop(e, 'evening')}
                        className={`transition-colors rounded-xl p-2 -m-2 ${
                          dragOverSegment === 'evening' && draggedTaskId
                            ? 'bg-blue-900/20 ring-1 ring-blue-500/50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full bg-purple-400" />
                          <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            {t('eveningBlock', lang)}
                          </h3>
                          <span className="text-[10px] text-text-muted">({eveningTasks.length} {t('plansPlural', lang)})</span>
                        </div>
                        <div className="space-y-2.5 border-l-2 border-border-default pl-3 ml-1 min-h-[36px]">
                          {eveningTasks.length > 0 ? (
                            eveningTasks.map((task) =>
                              renderTaskCard(task, 'evening', indexMap.get(task.id) ?? 0, totalTimelineCount)
                            )
                          ) : (
                            <div className="py-4 px-3 rounded-lg border border-dashed border-border-default text-[10px] text-text-muted text-center">
                              Drop plan here to schedule in Evening block
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default TimelineView;
