import React, { useState, useEffect, useMemo } from 'react';
import type { Task, FocusSession, Language, WorkScheduleConfig } from '../types';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Copy,
  Check,
  Timer,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Play,
  Calendar,
  Layers,
  ChevronRight,
  RotateCcw,
  Bell,
  CheckCircle,
  Trophy,
  Zap,
} from 'lucide-react';
import { t } from '../utils/i18n';
import {
  getTodayDateString,
  getWeekDays,
  formatReadableDate,
  formatTime,
  taskOccursOnDate,
  getTaskStatus,
  timeToMinutes,
} from '../utils/dateUtils';
import { formatHoursMinutes } from '../utils/scheduler';
import { ProductivityDashboard } from './ProductivityDashboard';
import { calculateStreak, type StreakStats } from '../utils/streakUtils';

interface AnalyticsViewProps {
  tasks: Task[];
  focusSessions: FocusSession[];
  config: WorkScheduleConfig;
  dailyGoalMinutes?: number;
  lang: Language;
  streakStats?: StreakStats;
  activeTimerTaskId?: string | null;
  onOpenFocusModal: (task?: Task) => void;
  onToggleComplete?: (taskId: string) => void;
  onNavigateToPlans?: () => void;
  onNavigateToWeekly?: () => void;
  onOpenOptimizer?: () => void;
  onTriggerRebalance?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  tasks,
  focusSessions,
  config,
  dailyGoalMinutes = 240,
  lang,
  streakStats,
  activeTimerTaskId,
  onOpenFocusModal,
  onToggleComplete,
  onNavigateToPlans,
  onNavigateToWeekly,
  onOpenOptimizer,
  onTriggerRebalance,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => getTodayDateString(currentTime), [currentTime]);
  const timeFormat = config.timeFormat || '24h';
  const weekStart: 0 | 1 = config.weekStartsOn ?? 1;
  const currentClock = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

  // Streak Gamification Calculation (100% daily task completion streak)
  const streak = useMemo(() => {
    return streakStats || calculateStreak(tasks, todayStr, currentTime);
  }, [streakStats, tasks, todayStr, currentTime]);

  // 1. Filter Today's Tasks
  const todayTasks = useMemo(() => {
    return tasks.filter(t => taskOccursOnDate(t, todayStr));
  }, [tasks, todayStr]);

  // Status breakdown for today
  const todayCompleted = useMemo(() => todayTasks.filter(t => t.completed), [todayTasks]);
  const todayInProgress = useMemo(() => {
    return todayTasks.filter(t => !t.completed && (t.id === activeTimerTaskId || getTaskStatus(t, todayStr, currentClock) === 'in_progress'));
  }, [todayTasks, activeTimerTaskId, todayStr, currentClock]);
  const todayOverdue = useMemo(() => {
    return todayTasks.filter(t => !t.completed && getTaskStatus(t, todayStr, currentClock) === 'overdue');
  }, [todayTasks, todayStr, currentClock]);
  const todayPending = useMemo(() => {
    return todayTasks.filter(t => !t.completed && getTaskStatus(t, todayStr, currentClock) === 'pending');
  }, [todayTasks, todayStr, currentClock]);

  // Durations for Today
  const todayPlannedMinutes = useMemo(() => {
    return todayTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  }, [todayTasks]);

  const todayActualMinutes = useMemo(() => {
    const taskActuals = todayTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);
    const todayTargetStr = currentTime.toDateString();
    const sessionActuals = focusSessions
      .filter(s => s.completedAt && new Date(s.completedAt).toDateString() === todayTargetStr)
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    return Math.max(taskActuals, sessionActuals);
  }, [todayTasks, focusSessions, currentTime]);

  const todayCompletionPercent = todayTasks.length > 0
    ? Math.round((todayCompleted.length / todayTasks.length) * 100)
    : 0;

  // 2. Weekly Metrics (Monday - Sunday)
  const weekDays = useMemo(() => getWeekDays(todayStr, weekStart), [todayStr, weekStart]);
  const weekDatesSet = useMemo(() => new Set(weekDays.map(d => d.dateStr)), [weekDays]);

  const weekTasks = useMemo(() => {
    return tasks.filter(t => weekDays.some(d => taskOccursOnDate(t, d.dateStr)));
  }, [tasks, weekDays]);

  const weekCompletedCount = useMemo(() => weekTasks.filter(t => t.completed).length, [weekTasks]);
  const weekCompletionPercent = weekTasks.length > 0
    ? Math.round((weekCompletedCount / weekTasks.length) * 100)
    : 0;

  const weekPlannedMinutes = useMemo(() => {
    return weekTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  }, [weekTasks]);

  const weekActualMinutes = useMemo(() => {
    const taskMins = weekTasks.reduce((acc, t) => acc + (t.actualDurationMinutes || 0), 0);
    const sessionMins = focusSessions
      .filter(s => {
        if (!s.completedAt) return false;
        const d = new Date(s.completedAt);
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return weekDatesSet.has(ymd);
      })
      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    return Math.max(taskMins, sessionMins);
  }, [weekTasks, focusSessions, weekDatesSet]);

  // 3. Find Next Task to Start
  const nextTask = useMemo(() => {
    // Priority 1: Currently in-progress
    if (todayInProgress.length > 0) return todayInProgress[0];
    // Priority 2: Next scheduled pending task for today
    if (todayPending.length > 0) {
      return [...todayPending].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      })[0];
    }
    // Priority 3: Overdue task today
    if (todayOverdue.length > 0) return todayOverdue[0];
    // Priority 4: Any upcoming incomplete task
    const anyIncomplete = tasks.find(t => !t.completed);
    return anyIncomplete || null;
  }, [todayInProgress, todayPending, todayOverdue, tasks]);

  // 4. Upcoming Tasks & Reminders
  const upcomingTasks = useMemo(() => {
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    return todayTasks
      .filter(t => !t.completed && t.startTime && timeToMinutes(t.startTime) >= currentMins)
      .sort((a, b) => (timeToMinutes(a.startTime || '00:00') - timeToMinutes(b.startTime || '00:00')))
      .slice(0, 4);
  }, [todayTasks, currentTime]);

  // 5. Overdue / Missed Tasks
  const missedTasks = useMemo(() => {
    return tasks.filter(t => !t.completed && getTaskStatus(t, todayStr, currentClock) === 'overdue').slice(0, 4);
  }, [tasks, todayStr, currentClock]);

  // Format date and time
  const formattedToday = formatReadableDate(todayStr, { includeYear: true });
  const formattedClock = currentTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });

  const handleCopySummary = () => {
    const completedList = todayTasks
      .filter(t => t.completed)
      .map(t => `• [x] ${t.title} (${t.durationMinutes}m)`)
      .join('\n');
    const pendingList = todayTasks
      .filter(t => !t.completed)
      .map(t => `• [ ] ${t.title} [${t.startTime ? formatTime(t.startTime, timeFormat) : 'TBD'}] (${t.durationMinutes}m)`)
      .join('\n');

    const summaryText =
      `PlanDroid Productivity Report\n` +
      `Date: ${formattedToday} (${formattedClock})\n` +
      `Today: ${todayCompleted.length}/${todayTasks.length} Done (${todayCompletionPercent}%)\n` +
      `Weekly Completion: ${weekCompletedCount}/${weekTasks.length} (${weekCompletionPercent}%)\n` +
      `Planned Today: ${(todayPlannedMinutes / 60).toFixed(1)}h | Actual Focus: ${(todayActualMinutes / 60).toFixed(1)}h\n` +
      `Planned Week: ${(weekPlannedMinutes / 60).toFixed(1)}h | Actual Focus: ${(weekActualMinutes / 60).toFixed(1)}h\n\n` +
      `Completed Today:\n${completedList || 'None'}\n\n` +
      `Pending Schedule:\n${pendingList || 'All completed'}`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* 1. SMART TODAY HEADER BANNER WITH LIVE CLOCK */}
      <section
        aria-label="Today Overview"
        className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Today's Dashboard</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 mt-1">
              {formattedToday}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Live schedule & productivity momentum tracking
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="bg-slate-950/80 border border-slate-700/80 px-4 py-2 rounded-xl text-center shadow-inner">
              <div className="flex items-center gap-1.5 justify-center text-[10px] uppercase font-bold text-slate-400">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Current Time</span>
              </div>
              <span className="font-mono text-xl font-bold text-slate-100 tracking-tight">
                {formattedClock}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold active:scale-95 shadow-sm"
              title="Copy Daily Briefing"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Briefing'}</span>
            </button>
          </div>
        </div>

        {/* Dual Progress Bars: Today vs Week */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
          {/* Today Progress */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Daily Completion</span>
              <span className="font-mono font-bold text-blue-400">{todayCompletionPercent}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${todayCompletionPercent}%` }}
                className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{todayCompleted.length} of {todayTasks.length} tasks done</span>
              <span>{todayTasks.length - todayCompleted.length} remaining</span>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Weekly Completion</span>
              <span className="font-mono font-bold text-emerald-400">{weekCompletionPercent}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${weekCompletionPercent}%` }}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{weekCompletedCount} of {weekTasks.length} tasks done</span>
              <span>{weekTasks.length - weekCompletedCount} remaining</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. GAMIFIED DAILY PRODUCTIVITY STREAK COUNTER (100% COMPLETION) */}
      <section
        aria-label="Daily Productivity Streak"
        className="bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-lg relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-600/30">
              <Flame className="w-7 h-7 fill-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Daily Streak
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>All-Time Best: <strong className="text-slate-200 font-mono">{streak.longestStreak} days</strong></span>
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight flex items-center gap-1.5">
                  <span>{streak.currentStreak}</span>
                  <span className="text-lg font-bold text-slate-200 font-sans">{streak.currentStreak === 1 ? 'Day' : 'Days'}</span>
                </h3>
                <span className="text-xs font-semibold text-slate-400">
                  (100% daily completion)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {streak.streakStatusMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end justify-center shrink-0">
            {streak.todayCompleted100 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Today 100% Cleared! 🔥</span>
              </span>
            ) : streak.todayTasksCount === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/30 text-xs font-medium">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>No tasks scheduled today</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{streak.todayCompletedCount}/{streak.todayTasksCount} completed today</span>
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono mt-1">
              Next milestone: {streak.nextMilestone} days
            </span>
          </div>
        </div>

        {/* Milestone Progression Bar */}
        <div className="mt-4 pt-3.5 border-t border-amber-900/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <span>Milestone Target:</span>
              <strong className="text-amber-400 font-mono">{streak.nextMilestone}-Day Champion</strong>
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {streak.progressToMilestone}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-amber-900/40 p-0.5">
            <div
              style={{ width: `${Math.max(4, streak.progressToMilestone)}%` }}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-500"
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Finish all planned activities today to advance</span>
            <span>{Math.max(0, streak.nextMilestone - streak.currentStreak)} days remaining</span>
          </div>
        </div>
      </section>

      {/* 3. PROMINENT "START NEXT TASK" ACTION CARD */}
      <section
        aria-label="Start Next Task"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Play className="w-5 h-5 text-indigo-400 fill-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Actionable Focus
              </span>
              <h3 className="text-base font-bold text-slate-100 mt-1">
                {nextTask ? nextTask.title : 'All Caught Up For Now!'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {nextTask ? (
                  <span>
                    Scheduled at <strong className="text-slate-200 font-mono">{nextTask.startTime ? formatTime(nextTask.startTime, timeFormat) : 'Anytime'}</strong> ({nextTask.durationMinutes}m duration)
                  </span>
                ) : (
                  'No pending tasks remaining. Great job maintaining your schedule!'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {nextTask ? (
              <button
                type="button"
                onClick={() => onOpenFocusModal(nextTask)}
                className="w-full sm:w-auto py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{t('startNextTask', lang)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenFocusModal()}
                className="w-full sm:w-auto py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Timer className="w-4 h-4 text-blue-400" />
                <span>Open Open-Ended Timer</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. TODAY'S TASK STATUSES & DURATIONS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Planned Tasks Today */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="truncate">Planned Today</span>
            <Layers className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-blue-400">{todayTasks.length}</span>
            <span className="text-[11px] text-slate-500">tasks</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono pt-1">
            Planned: <strong className="text-slate-200">{formatHoursMinutes(todayPlannedMinutes)}</strong>
          </p>
        </div>

        {/* Completed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="truncate">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-emerald-400">{todayCompleted.length}</span>
            <span className="text-[11px] text-slate-500">({todayCompletionPercent}%)</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono pt-1">
            Tracked: <strong className="text-emerald-400">{formatHoursMinutes(todayActualMinutes)}</strong>
          </p>
        </div>

        {/* Pending & In Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="truncate">Pending / Active</span>
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-amber-400">
              {todayPending.length + todayInProgress.length}
            </span>
            {todayInProgress.length > 0 && (
              <span className="text-[10px] font-bold text-indigo-400 animate-pulse">(1 active)</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-mono pt-1">
            Remaining: <strong className="text-slate-200">{formatHoursMinutes(Math.max(0, todayPlannedMinutes - todayActualMinutes))}</strong>
          </p>
        </div>

        {/* Overdue / Missed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="truncate">Overdue / Missed</span>
            <AlertTriangle className={`w-4 h-4 shrink-0 ${todayOverdue.length > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-extrabold ${todayOverdue.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {todayOverdue.length}
            </span>
            <span className="text-[11px] text-slate-500">tasks</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono pt-1">
            {todayOverdue.length > 0 ? 'Needs reschedule or check' : 'All on track!'}
          </p>
        </div>
      </div>

      {/* 4. WEEKLY TOTALS SUMMARY ROW */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Weekly Overview (Monday – Sunday)
            </h4>
          </div>
          {onNavigateToWeekly && (
            <button
              type="button"
              onClick={onNavigateToWeekly}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Full Weekly Planner</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Weekly Tasks</span>
            <span className="font-mono text-base font-bold text-slate-200">
              {weekCompletedCount} / {weekTasks.length}
            </span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Completion Rate</span>
            <span className="font-mono text-base font-bold text-emerald-400">
              {weekCompletionPercent}%
            </span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Planned Focus Time</span>
            <span className="font-mono text-base font-bold text-blue-400">
              {formatHoursMinutes(weekPlannedMinutes)}
            </span>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Actual Focus Time</span>
            <span className="font-mono text-base font-bold text-indigo-400">
              {formatHoursMinutes(weekActualMinutes)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE 7-DAY RECHARTS VISUALIZATION */}
      <ProductivityDashboard
        tasks={tasks}
        focusSessions={focusSessions}
        lang={lang}
      />

      {/* 6. UPCOMING TASKS & OVERDUE ACTION LISTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Tasks & Reminders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('upcomingTasks', lang)}</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {upcomingTasks.length} upcoming
            </span>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
              No more scheduled tasks for today.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs hover:border-slate-700 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-400 text-[11px]">
                        {task.startTime ? formatTime(task.startTime, timeFormat) : '—'}
                      </span>
                      <span className="text-slate-200 font-medium truncate">{task.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {task.durationMinutes}m • {task.reminderMinutesBefore !== undefined ? `${task.reminderMinutesBefore}m reminder` : 'No reminder'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenFocusModal(task)}
                    className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg transition cursor-pointer shrink-0"
                    title="Start Timer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missed / Overdue Tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('overdueTasks', lang)}</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {missedTasks.length} overdue
            </span>
          </div>

          {missedTasks.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>No overdue tasks! You're on track.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {missedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-rose-200 font-medium truncate">{task.title}</p>
                    <span className="text-[10px] text-rose-400 font-mono">
                      Was scheduled for {task.startTime ? formatTime(task.startTime, timeFormat) : 'earlier'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onToggleComplete && (
                      <button
                        type="button"
                        onClick={() => onToggleComplete(task.id)}
                        className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-[10px] font-medium transition cursor-pointer"
                        title="Mark Complete"
                      >
                        Done
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenFocusModal(task)}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer"
                      title="Start Timer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
