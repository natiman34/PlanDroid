import React, { useState, useMemo, useEffect } from 'react';
import type { Task, WorkScheduleConfig, Language, WeeklyViewMode } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  Circle,
  Copy,
  Trash2,
  Edit,
  Clock,
  AlertTriangle,
  ArrowRight,
  Check,
  CalendarDays,
  List,
  Layers,
  Sparkles,
  Repeat,
  RotateCcw,
  Flame,
  X,
} from 'lucide-react';
import { t } from '../utils/i18n';
import {
  getTodayDateString,
  getWeekDays,
  shiftWeek,
  formatTime,
  formatReadableDate,
  taskOccursOnDate,
  findTaskConflictsForDate,
  getTaskStatus,
} from '../utils/dateUtils';
import { formatHoursMinutes } from '../utils/scheduler';

interface WeeklyPlannerViewProps {
  tasks: Task[];
  config: WorkScheduleConfig;
  lang: Language;
  activeTimerTaskId?: string | null;
  onOpenCreate: (preselectedDate?: string) => void;
  onOpenEdit: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (task: Task, targetDate?: string) => void;
  onStartTimer: (task: Task) => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  tasks,
  config,
  lang,
  activeTimerTaskId,
  onOpenCreate,
  onOpenEdit,
  onToggleComplete,
  onDeleteTask,
  onDuplicateTask,
  onStartTimer,
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [selectedWeekAnchor, setSelectedWeekAnchor] = useState<string>(todayStr);
  const [selectedDayDate, setSelectedDayDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<WeeklyViewMode>('calendar');
  const [copyModalTask, setCopyModalTask] = useState<Task | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentClock, setCurrentClock] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  });

  // Keep clock updated every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setCurrentClock(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const weekStartsOn = config.weekStartsOn ?? 1; // 1 = Monday, 0 = Sunday
  const weekDays = useMemo(() => {
    return getWeekDays(selectedWeekAnchor, weekStartsOn);
  }, [selectedWeekAnchor, weekStartsOn]);

  const weekStartDateStr = weekDays[0]?.dateStr || '';
  const weekEndDateStr = weekDays[6]?.dateStr || '';

  // Calculate week-wide metrics
  const weekStats = useMemo(() => {
    let plannedMinutes = 0;
    let actualMinutes = 0;
    let totalTasks = 0;
    let completedTasks = 0;

    for (const day of weekDays) {
      const dayTasks = tasks.filter(t => taskOccursOnDate(t, day.dateStr));
      totalTasks += dayTasks.length;
      for (const t of dayTasks) {
        plannedMinutes += t.durationMinutes || 0;
        actualMinutes += t.actualDurationMinutes || 0;
        if (t.completed) completedTasks++;
      }
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { plannedMinutes, actualMinutes, totalTasks, completedTasks, completionRate };
  }, [tasks, weekDays]);

  // Tasks organized by day
  const tasksByDay = useMemo(() => {
    const map = new Map<string, { tasks: Task[]; conflicts: Map<string, string[]>; plannedMins: number; actualMins: number }>();

    for (const day of weekDays) {
      const dayTasks = tasks
        .filter(t => taskOccursOnDate(t, day.dateStr))
        .sort((a, b) => {
          if (!a.startTime && !b.startTime) return a.createdAt - b.createdAt;
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime.localeCompare(b.startTime);
        });

      const conflicts = findTaskConflictsForDate(tasks, day.dateStr);
      const plannedMins = dayTasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
      const actualMins = dayTasks.reduce((sum, t) => sum + (t.actualDurationMinutes || 0), 0);

      map.set(day.dateStr, { tasks: dayTasks, conflicts, plannedMins, actualMins });
    }

    return map;
  }, [tasks, weekDays]);

  const handlePrevWeek = () => {
    setSelectedWeekAnchor(prev => shiftWeek(prev, -1));
  };

  const handleNextWeek = () => {
    setSelectedWeekAnchor(prev => shiftWeek(prev, 1));
  };

  const handleJumpToday = () => {
    setSelectedWeekAnchor(todayStr);
    setSelectedDayDate(todayStr);
  };

  const timeFormat = config.timeFormat || '24h';

  // Category badge colors (design system palette)
  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'deep_work': return 'bg-blue-900/30 text-blue-400 border border-blue-500/40';
      case 'meeting': return 'bg-indigo-900/30 text-indigo-400 border border-indigo-500/40';
      case 'admin': return 'bg-slate-900/30 text-slate-400 border border-slate-500/40';
      case 'review': return 'bg-amber-900/30 text-amber-400 border border-amber-500/40';
      case 'break': return 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/40';
      case 'personal': return 'bg-purple-900/30 text-purple-400 border border-purple-500/40';
      default: return 'bg-surface-hover text-text-muted border border-border-default';
    }
  };

  const statCard = (title: string, value: string, subtitle: string, colorClass: string) => (
    <div className="rounded-lg border border-border-default bg-surface-panel p-3 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">{title}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-base font-bold font-mono ${colorClass}`}>{value}</span>
        <span className="text-[11px] text-text-muted">{subtitle}</span>
      </div>
    </div>
  );

  const isManuallyScheduled = (t: Task) => Boolean(t.startTime);

  return (
    <div className="space-y-5 pageenter pageenteractive pb-[calc(env(safe-area-inset-bottom,0px)+8rem)]">
      {/* 1. Header: Week Navigation & Controls */}
      <div className="rounded-xl border border-border-default bg-surface-panel p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Week Title & Today button */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary">
                  {t('weeklyPlannerTitle', lang)}
                </h2>
                <span className="text-xs font-mono font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {currentClock}
                </span>
              </div>
              <p className="text-[10px] text-text-muted">
                {formatReadableDate(weekStartDateStr, { shortDay: true })} – {formatReadableDate(weekEndDateStr, { shortDay: true, includeYear: true })}
              </p>
            </div>
          </div>

          {/* Navigation & View Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Today Jump Button */}
            <button
              type="button"
              onClick={handleJumpToday}
              className="btnsecondary text-[10px]"
            >
              {t('jumpToday', lang)}
            </button>

            {/* Week Arrow Buttons */}
            <div className="flex items-center bg-surface-elevated rounded-lg border border-border-default p-0.5">
              <button
                type="button"
                onClick={handlePrevWeek}
                title="Previous Week"
                className="btnicon btnghost size-8 text-text-muted hover:text-text-primary hover:bg-surface-hover"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                title="Next Week"
                className="btnicon btnghost size-8 text-text-muted hover:text-text-primary hover:bg-surface-hover"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-surface-elevated rounded-lg border border-border-default p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                title={t('viewCalendar', lang)}
                className={`btnicon btnghost size-9 transition cursor-pointer ${viewMode === 'calendar' ? 'btnprimary' : 'btnghost text-text-muted hover:text-text-primary'}`}
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                title={t('viewAgenda', lang)}
                className={`btnicon btnghost size-9 transition cursor-pointer ${viewMode === 'agenda' ? 'btnprimary' : 'btnghost text-text-muted hover:text-text-primary'}`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title={t('viewList', lang)}
                className={`btnicon btnghost size-9 transition cursor-pointer ${viewMode === 'list' ? 'btnprimary' : 'btnghost text-text-muted hover:text-text-primary'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => onOpenCreate(selectedDayDate)}
              className="btnprimary text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addTask', lang)}</span>
            </button>
          </div>
        </div>

        {/* 2. Weekly Summary Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border-default">
          {statCard(
            t('totalTasks', lang),
            String(weekStats.totalTasks),
            `(${weekStats.completedTasks} ${t('done', lang)})`,
            'text-text-primary'
          )}
          {statCard(
            t('completionRate', lang),
            `${weekStats.completionRate}%`,
            '',
            'text-emerald-400'
          )}
          {statCard(
            t('plannedFocus', lang),
            formatHoursMinutes(weekStats.plannedMinutes),
            '',
            'text-blue-400'
          )}
          {statCard(
            t('actualTime', lang),
            formatHoursMinutes(weekStats.actualMinutes),
            '',
            'text-indigo-400'
          )}
        </div>
      </div>

      {/* 3. Horizontal Day Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {weekDays.map((day) => {
          const isSelected = day.dateStr === selectedDayDate;
          const dayInfo = tasksByDay.get(day.dateStr);
          const taskCount = dayInfo?.tasks.length || 0;
          const completedCount = dayInfo?.tasks.filter(t => t.completed).length || 0;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDayDate(day.dateStr)}
              className={`flex-1 min-w-[70px] sm:min-w-[88px] p-2.5 rounded-xl border text-center transition cursor-pointer select-none relative ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold ring-1 ring-blue-500/50'
                  : day.isToday
                  ? 'bg-surface-elevated border-amber-500/50 text-amber-400'
                  : 'bg-surface-elevated border-border-default text-text-muted hover:border-border-focused'
              }`}
            >
              <span className="text-[10px] font-bold uppercase block tracking-wider">{day.dayShort}</span>
              <span className={`text-lg font-mono font-bold block my-0.5 ${day.isToday ? 'text-amber-400' : 'text-text-primary'}`}>
                {day.dayNumber}
              </span>
              <div className="flex items-center justify-center gap-1 text-[9px] text-text-muted">
                {taskCount > 0 ? (
                  <span className={`px-1.5 py-0.2 rounded-full font-mono text-[8px] ${completedCount === taskCount ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/50 font-bold' : 'bg-surface-hover text-text-muted border border-border-default'}`}>
                    {completedCount}/{taskCount}
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </div>

              {day.isToday && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animateandroidpulse" title="Today" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. VIEW RENDERING */}

      {/* VIEW A: Full Weekly Calendar Grid (Monday - Sunday) */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayInfo = tasksByDay.get(day.dateStr);
            const dayTasks = dayInfo?.tasks || [];
            const conflicts = dayInfo?.conflicts || new Map();
            const isToday = day.isToday;

            return (
              <div
                key={day.dateStr}
                className={`flex flex-col rounded-xl border overflow-hidden transition min-h-[320px] ${
                  isToday
                    ? 'border-blue-500/60 shadow-lg shadow-blue-500/10'
                    : 'border-border-default bg-surface-panel hover:border-border-focused'
                }`}
              >
                {/* Day Header */}
                <div className={`p-2.5 border-b flex items-center justify-between ${
                  isToday ? 'bg-blue-600/10 border-blue-500/30' : 'bg-surface-elevated/60 border-border-default'
                }`}>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted block">{day.dayName}</span>
                    <span className="text-[11px] font-mono text-text-secondary">{day.monthName} {day.dayNumber}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCreate(day.dateStr)}
                    className="btnicon btnghost size-8 text-text-muted hover:text-blue-400 hover:bg-surface-hover"
                    title={`Add task for ${day.dayName}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Tasks List */}
                <div className="p-2 flex-1 flex flex-col gap-1.5 overflow-y-auto">
                  {dayTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-text-muted">
                      <span className="text-[10px]">{t('noTasks', lang)}</span>
                      <button
                        type="button"
                        onClick={() => onOpenCreate(day.dateStr)}
                        className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer underline underline-offset-2"
                      >
                        {t('addActivity', lang)}
                      </button>
                    </div>
                  ) : (
                    dayTasks.map((task) => {
                      const status = getTaskStatus(task, todayStr, currentClock, activeTimerTaskId);
                      const hasConflict = conflicts.has(task.id);
                      const isTimerRunning = activeTimerTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className={`p-2 rounded-lg border text-left transition relative group ${
                            task.completed
                              ? 'bg-surface-hover border-border-default opacity-60'
                              : isTimerRunning
                              ? 'bg-blue-900/30 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                              : status === 'overdue'
                              ? 'bg-rose-900/20 border-rose-800/50 hover:border-rose-700'
                              : 'bg-surface-base border-border-default hover:border-border-focused'
                          }`}
                        >
                          {/* Top: Category & Time */}
                          <div className="flex items-center justify-between text-[9px] mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border ${getCategoryColor(task.category)}`}>
                              {(task.category || 'task').replace('_', ' ')}
                            </span>
                            {task.startTime && (
                              <span className="font-mono text-text-muted flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTime(task.startTime, timeFormat)}
                              </span>
                            )}
                          </div>

                          {/* Title & Checkbox */}
                          <div className="flex items-start gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToggleComplete(task.id)}
                              className="mt-0.5 text-text-muted hover:text-emerald-400 transition cursor-pointer shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-sm font-semibold leading-snug truncate ${
                                task.completed ? 'line-through text-text-muted' : 'text-text-primary'
                              }`}>
                                {task.title}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[9px] text-text-muted mt-0.5">
                                <span>{task.durationMinutes}m</span>
                                {task.actualDurationMinutes ? (
                                  <span className="text-blue-400 font-mono">• {task.actualDurationMinutes}m tracked</span>
                                ) : null}
                                {task.recurrence && task.recurrence.frequency !== 'none' && (
                                  <span title={`Recurs ${task.recurrence.frequency}`}>
                                    <Repeat className="w-2 h-2 text-blue-400" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Overlap Warning Badge */}
                          {hasConflict && !task.completed && (
                            <div className="mt-1 p-1 bg-rose-900/20 border border-rose-800/50 rounded text-[8px] text-rose-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                              <span className="truncate">{t('overlapsAnotherPlan', lang)}</span>
                            </div>
                          )}

                          {/* Card Action Bar */}
                          <div className="mt-2 pt-1 border-t border-border-default flex items-center justify-between gap-1 opacity-90 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => onStartTimer(task)}
                              className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[9px] font-semibold transition cursor-pointer flex items-center gap-0.5"
                              title="Start Timer for this task"
                            >
                              <Play className="w-2.5 h-2.5" />
                              <span>{t('startTimer', lang)}</span>
                            </button>

                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setCopyModalTask(task)}
                                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                                title={t('copyTask', lang)}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenEdit(task)}
                                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                                title={t('editPlan', lang)}
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(task.id)}
                                className="p-1 rounded text-text-muted hover:text-rose-400 hover:bg-rose-900/30 transition cursor-pointer"
                                title={t('deletePlan', lang)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Day Footer with Totals */}
                <div className="p-2 border-t border-border-default bg-surface-elevated/40 text-[9px] text-text-muted flex items-center justify-between">
                  <span>{t('planned', lang)}: {formatHoursMinutes(dayInfo?.plannedMins || 0)}</span>
                  {dayInfo?.actualMins ? (
                    <span className="text-blue-400 font-mono font-semibold">Act: {formatHoursMinutes(dayInfo.actualMins)}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW B: Daily Agenda View (Detailed focus on selectedDayDate) */}
      {viewMode === 'agenda' && (
        <div className="rounded-xl border border-border-default bg-surface-panel shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span>{formatReadableDate(selectedDayDate, { includeYear: true })}</span>
                {selectedDayDate === todayStr && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {t('today', lang).toUpperCase()}
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                {t('agendaDesc', lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCreate(selectedDayDate)}
              className="btnprimary text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" />
              <span>{t('scheduleNewPlan', lang)}</span>
            </button>
          </div>

          {/* Agenda Task List */}
          {(() => {
            const dayInfo = tasksByDay.get(selectedDayDate);
            const dayTasks = dayInfo?.tasks || [];
            const conflicts = dayInfo?.conflicts || new Map();

            if (dayTasks.length === 0) {
              return (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center mx-auto text-text-muted">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-text-secondary">{t('noActivities', lang)}</p>
                  <p className="text-[10px] text-text-muted max-w-xs mx-auto">
                    {t('noActivitiesDesc', lang)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCreate(selectedDayDate)}
                    className="btnprimary text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('scheduleNewPlanShort', lang)}</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {dayTasks.map((task) => {
                  const status = getTaskStatus(task, todayStr, currentClock, activeTimerTaskId);
                  const hasConflict = conflicts.has(task.id);
                  const isTimerRunning = activeTimerTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`p-2.5 rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        task.completed
                          ? 'bg-surface-hover border-border-default opacity-60'
                          : isTimerRunning
                          ? 'bg-blue-900/30 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                          : status === 'overdue'
                          ? 'bg-rose-900/20 border-rose-800/60'
                          : 'bg-surface-base border-border-default hover:border-border-focused'
                      }`}
                    >
                      {/* Left: Checkbox & Info */}
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(task.id)}
                          className="mt-0.5 text-text-muted hover:text-emerald-400 transition cursor-pointer shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1 mb-1">
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${getCategoryColor(task.category)}`}>
                              {(task.category || 'task').replace('_', ' ')}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              task.priority === 'urgent' ? 'bg-rose-900 text-rose-400 border border-rose-800/50' :
                              task.priority === 'high' ? 'bg-amber-900 text-amber-400 border border-amber-800/50' :
                                                            'bg-surface-hover text-text-muted border border-border-default'
                            }`}>
                              {task.priority}
                            </span>
                            {status === 'overdue' && (
                              <span className="text-[9px] font-bold bg-rose-900 text-rose-400 border border-rose-800 px-2 py-0.5 rounded">
                                {t('overdue', lang)}
                              </span>
                            )}
                            {hasConflict && (
                              <span className="text-[9px] font-bold bg-amber-900 text-amber-400 border border-amber-800 px-2 py-0.5 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2 h-2 text-amber-400" />
                                <span className="truncate text-[8px]">{t('conflictWith', lang)} {conflicts.get(task.id)?.[0]}</span>
                              </span>
                            )}
                          </div>

                          <h4 className={`text-sm font-semibold ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-[10px] text-text-muted mt-1 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-2 text-[9px] text-text-muted mt-2 font-mono">
                            {task.startTime && task.endTime && (
                              <span className="text-text-secondary">{formatTime(task.startTime, timeFormat)} - {formatTime(task.endTime, timeFormat)}</span>
                            )}
                            <span>{task.durationMinutes}m</span>
                            {task.actualDurationMinutes ? (
                              <span className="text-blue-400 font-bold">• Actual: {task.actualDurationMinutes}m</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onStartTimer(task)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-semibold shadow-sm transition active:scale-[0.97] cursor-pointer flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>{t('startTimerShort', lang)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyModalTask(task)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                          title={t('copyToDay', lang)}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(task)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                          title={t('edit', lang)}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(task.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-900/30 transition cursor-pointer"
                          title={t('delete', lang)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW C: Simple List View */}
      {viewMode === 'list' && (
        <div className="rounded-xl border border-border-default bg-surface-panel p-5 space-y-4">
          <div className="border-b border-border-default pb-3">
            <h3 className="text-sm font-bold text-text-primary">{t('weekScheduleList', lang)}</h3>
            <p className="text-[10px] text-text-muted">{t('linearViewWeek', lang)}</p>
          </div>

          <div className="space-y-3">
            {weekDays.map((day) => {
              const dayInfo = tasksByDay.get(day.dateStr);
              const dayTasks = dayInfo?.tasks || [];
              if (dayTasks.length === 0) return null;

              return (
                <div key={day.dateStr} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-text-muted border-b border-border-default pb-1">
                    <span className="flex items-center gap-1.5">
                      <span>{day.dayName}, {day.monthName} {day.dayNumber}</span>
                      {day.isToday && <span className="text-[10px] text-amber-400 font-bold">({t('today', lang)})</span>}
                    </span>
                    <span className="font-mono text-text-secondary">{formatHoursMinutes(dayInfo?.plannedMins || 0)}</span>
                  </div>

                  <div className="space-y-1">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-2 rounded-lg border border-border-default bg-surface-base flex items-center justify-between gap-2 text-[10px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleComplete(task.id)}
                            className="text-text-muted hover:text-emerald-400 transition cursor-pointer"
                          >
                            {task.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Circle className="w-3.5 h-3.5" />}
                          </button>
                          <span className={`truncate font-medium ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-text-secondary shrink-0">
                          {task.startTime && <span>{formatTime(task.startTime, timeFormat)}</span>}
                          <span>{task.durationMinutes}m</span>
                          <button
                            type="button"
                            onClick={() => onStartTimer(task)}
                            className="p-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                          >
                            <Play className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MODAL: Copy Plan to Another Day */}
      {copyModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animatefadein duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-panel p-6 shadow-2xl relative animatezoomin duration-200">
            <div className="flex items-center justify-between border-b border-border-default pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary">{t('copyPlanToDay', lang)}</h3>
                <p className="text-[10px] text-text-muted truncate max-w-[240px]">
                  "{copyModalTask.title}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCopyModalTask(null)}
                className="btnicon btnghost size-8 text-text-muted hover:text-text-primary hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="fieldlabel">{t('selectDestinationDay', lang)}</label>
              <div className="grid grid-cols-2 gap-2">
                {weekDays.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => {
                      onDuplicateTask(copyModalTask, d.dateStr);
                      setCopyModalTask(null);
                    }}
                    className="p-2.5 rounded-lg border border-border-default bg-surface-elevated text-left flex flex-col gap-0.5 transition cursor-pointer hover:border-border-focused hover:bg-surface-hover active:scale-[0.97]"
                  >
                    <span className="text-xs font-bold text-text-primary block">{d.dayName}</span>
                    <span className="text-[9px] text-text-muted font-mono">{d.monthName} {d.dayNumber}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setCopyModalTask(null)}
                className="btnsecondary text-xs"
              >
                {t('cancel', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Confirm Delete Task */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animatefadein duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-panel p-6 shadow-2xl relative animatezoomin duration-200">
            <h3 className="text-sm font-bold text-text-primary">{t('deleteScheduledPlan', lang)}</h3>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
              {t('confirmDeleteDesc', lang)}
            </p>
            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="btnsecondary text-xs"
              >
                {t('cancel', lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="btndanger text-xs font-bold"
              >
                {t('delete', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlannerView;
