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

  // Category badge colors
  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'deep_work': return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'meeting': return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'admin': return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      case 'review': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'break': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'personal': return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default: return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150 pb-16">
      {/* 1. Header: Week Navigation & Controls */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Week Title & Today button */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Weekly Planner
                </h2>
                <span className="text-xs font-mono font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {currentClock}
                </span>
              </div>
              <p className="text-xs text-slate-400">
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
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Today
            </button>

            {/* Week Arrow Buttons */}
            <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={handlePrevWeek}
                title="Previous Week"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                title="Next Week"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                title="Weekly Calendar View"
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'calendar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                title="Daily Agenda View"
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'agenda' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Agenda</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Simple List View"
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">List</span>
              </button>
            </div>

            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => onOpenCreate(selectedDayDate)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* 2. Weekly Summary Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Weekly Tasks</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold font-mono text-slate-100">{weekStats.totalTasks}</span>
              <span className="text-[11px] text-emerald-400 font-semibold">({weekStats.completedTasks} done)</span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Completion Rate</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold font-mono text-emerald-400">{weekStats.completionRate}%</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden self-center">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${weekStats.completionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Planned Focus Time</span>
            <span className="text-base font-bold font-mono text-blue-400 mt-0.5 block">
              {formatHoursMinutes(weekStats.plannedMinutes)}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Actual Time Tracked</span>
            <span className="text-base font-bold font-mono text-indigo-400 mt-0.5 block">
              {formatHoursMinutes(weekStats.actualMinutes)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Day Selector (Always available on mobile and agenda views) */}
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
              className={`flex-1 min-w-[70px] sm:min-w-[90px] p-2.5 rounded-2xl border text-center transition cursor-pointer select-none relative ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold ring-1 ring-blue-500/50'
                  : day.isToday
                  ? 'bg-slate-900 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase block tracking-wider">
                {day.dayShort}
              </span>
              <span className={`text-base font-mono font-bold block my-0.5 ${day.isToday ? 'text-amber-400' : 'text-slate-100'}`}>
                {day.dayNumber}
              </span>
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                {taskCount > 0 ? (
                  <span className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] ${completedCount === taskCount ? 'bg-emerald-950 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-300'}`}>
                    {completedCount}/{taskCount}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>

              {day.isToday && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" title="Today" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. VIEW RENDERING */}

      {/* VIEW A: Full Weekly Calendar Grid (Monday - Sunday) */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayInfo = tasksByDay.get(day.dateStr);
            const dayTasks = dayInfo?.tasks || [];
            const conflicts = dayInfo?.conflicts || new Map();
            const isToday = day.isToday;

            return (
              <div
                key={day.dateStr}
                className={`flex flex-col rounded-2xl border bg-slate-900/90 overflow-hidden transition min-h-[380px] ${
                  isToday ? 'border-blue-500/60 shadow-lg shadow-blue-900/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Day Header */}
                <div className={`p-3 border-b flex items-center justify-between ${
                  isToday ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-950/40 border-slate-800/80'
                }`}>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">
                      {day.dayName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {day.monthName} {day.dayNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCreate(day.dateStr)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition cursor-pointer"
                    title={`Add task for ${day.dayName}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Tasks List */}
                <div className="p-2.5 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                  {dayTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-slate-500">
                      <span className="text-xs">No tasks</span>
                      <button
                        type="button"
                        onClick={() => onOpenCreate(day.dateStr)}
                        className="mt-2 text-[11px] text-blue-400 hover:underline cursor-pointer"
                      >
                        + Plan activity
                      </button>
                    </div>
                  ) : (
                    dayTasks.map((t) => {
                      const status = getTaskStatus(t, todayStr, currentClock, activeTimerTaskId);
                      const hasConflict = conflicts.has(t.id);
                      const isTimerRunning = activeTimerTaskId === t.id;

                      return (
                        <div
                          key={t.id}
                          className={`p-2.5 rounded-xl border text-left transition relative group ${
                            t.completed
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                              : isTimerRunning
                              ? 'bg-blue-950/40 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                              : status === 'overdue'
                              ? 'bg-rose-950/20 border-rose-800/50 hover:border-rose-700'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Top: Category & Time */}
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className={`px-1.5 py-0.5 rounded-md font-semibold border ${getCategoryColor(t.category)}`}>
                              {(t.category || 'task').replace('_', ' ')}
                            </span>
                            {t.startTime && (
                              <span className="font-mono text-slate-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTime(t.startTime, timeFormat)}
                              </span>
                            )}
                          </div>

                          {/* Title & Checkbox */}
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => onToggleComplete(t.id)}
                              className="mt-0.5 text-slate-400 hover:text-emerald-400 transition cursor-pointer shrink-0"
                            >
                              {t.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs font-semibold leading-snug truncate ${
                                t.completed ? 'line-through text-slate-400' : 'text-slate-100'
                              }`}>
                                {t.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>{t.durationMinutes}m</span>
                                {t.actualDurationMinutes ? (
                                  <span className="text-blue-400 font-mono">
                                    • {t.actualDurationMinutes}m tracked
                                  </span>
                                ) : null}
                                {t.recurrence && t.recurrence.frequency !== 'none' && (
                                  <span title={`Recurs ${t.recurrence.frequency}`}>
                                    <Repeat className="w-2.5 h-2.5 text-blue-400" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Overlap Warning Badge */}
                          {hasConflict && !t.completed && (
                            <div className="mt-1.5 p-1 bg-amber-950/50 border border-amber-600/40 rounded text-[9px] text-amber-300 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span className="truncate">Overlaps with another plan</span>
                            </div>
                          )}

                          {/* Card Action Bar */}
                          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1 opacity-90 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => onStartTimer(t)}
                              className="px-2 py-0.5 rounded-md bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-[10px] font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Start Timer for this task"
                            >
                              <Play className="w-2.5 h-2.5" />
                              <span>Timer</span>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setCopyModalTask(t)}
                                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                                title="Copy plan to another day"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenEdit(t)}
                                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                                title="Edit plan"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(t.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                                title="Delete plan"
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
                <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Planned: {formatHoursMinutes(dayInfo?.plannedMins || 0)}</span>
                  {dayInfo?.actualMins ? (
                    <span className="text-indigo-400 font-semibold font-mono">
                      Act: {formatHoursMinutes(dayInfo.actualMins)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW B: Daily Agenda View (Detailed focus on selectedDayDate) */}
      {viewMode === 'agenda' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{formatReadableDate(selectedDayDate, { includeYear: true })}</span>
                {selectedDayDate === todayStr && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                    TODAY
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed chronological agenda with duration and overlap tracking
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenCreate(selectedDayDate)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Plan</span>
            </button>
          </div>

          {/* Agenda Task List */}
          {(() => {
            const dayInfo = tasksByDay.get(selectedDayDate);
            const dayTasks = dayInfo?.tasks || [];
            const conflicts = dayInfo?.conflicts || new Map();

            if (dayTasks.length === 0) {
              return (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">No activities scheduled for this day</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add meetings, deep focus sessions, reviews or personal tasks to optimize your day.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCreate(selectedDayDate)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                  >
                    + Schedule New Plan
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {dayTasks.map((t) => {
                  const status = getTaskStatus(t, todayStr, currentClock, activeTimerTaskId);
                  const hasConflict = conflicts.has(t.id);
                  const isTimerRunning = activeTimerTaskId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        t.completed
                          ? 'bg-slate-950/40 border-slate-800 opacity-60'
                          : isTimerRunning
                          ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                          : status === 'overdue'
                          ? 'bg-rose-950/20 border-rose-800/60'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Checkbox & Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(t.id)}
                          className="mt-1 text-slate-400 hover:text-emerald-400 transition cursor-pointer shrink-0"
                        >
                          {t.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryColor(t.category)}`}>
                              {(t.category || 'task').replace('_', ' ')}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                              t.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                              t.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {t.priority}
                            </span>
                            {status === 'overdue' && (
                              <span className="text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-md">
                                Overdue
                              </span>
                            )}
                            {hasConflict && (
                              <span className="text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Conflict with {conflicts.get(t.id)?.[0]}
                              </span>
                            )}
                          </div>

                          <h4 className={`text-sm font-bold ${t.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {t.title}
                          </h4>

                          {t.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {t.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
                            {t.startTime && t.endTime && (
                              <span className="text-slate-300">
                                {formatTime(t.startTime, timeFormat)} - {formatTime(t.endTime, timeFormat)}
                              </span>
                            )}
                            <span>Duration: {t.durationMinutes}m</span>
                            {t.actualDurationMinutes ? (
                              <span className="text-blue-400 font-bold">
                                • Actual: {t.actualDurationMinutes}m
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => onStartTimer(t)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Timer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyModalTask(t)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Copy to another day"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEdit(t)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title="Edit plan"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(t.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-900/40 transition cursor-pointer"
                          title="Delete plan"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-100">
              Week Schedule Task List
            </h3>
            <p className="text-xs text-slate-400">
              Complete linear view of all planned activities across the current week
            </p>
          </div>

          <div className="space-y-4">
            {weekDays.map((day) => {
              const dayInfo = tasksByDay.get(day.dateStr);
              const dayTasks = dayInfo?.tasks || [];
              if (dayTasks.length === 0) return null;

              return (
                <div key={day.dateStr} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800/60 pb-1">
                    <span className="flex items-center gap-1.5">
                      <span>{day.dayName}, {day.monthName} {day.dayNumber}</span>
                      {day.isToday && <span className="text-[10px] text-amber-400 font-bold">(Today)</span>}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {formatHoursMinutes(dayInfo?.plannedMins || 0)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleComplete(t.id)}
                            className="text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                          >
                            {t.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4" />}
                          </button>
                          <span className={`truncate font-medium ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400 shrink-0">
                          {t.startTime && <span>{formatTime(t.startTime, timeFormat)}</span>}
                          <span>{t.durationMinutes}m</span>
                          <button
                            type="button"
                            onClick={() => onStartTimer(t)}
                            className="p-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Copy Plan to Another Day
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">
                  "{copyModalTask.title}"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCopyModalTask(null)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Destination Day:
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {weekDays.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => {
                      onDuplicateTask(copyModalTask, d.dateStr);
                      setCopyModalTask(null);
                    }}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-left hover:border-blue-500 hover:bg-blue-950/20 transition cursor-pointer"
                  >
                    <span className="text-xs font-bold block text-slate-200">{d.dayName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{d.monthName} {d.dayNumber}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCopyModalTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Confirm Delete Task */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl relative space-y-3">
            <h3 className="text-sm font-bold text-slate-100">
              Delete Scheduled Plan?
            </h3>
            <p className="text-xs text-slate-400">
              Are you sure you want to remove this plan from your schedule? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlannerView;
