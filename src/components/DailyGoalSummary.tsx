import React, { useState } from 'react';
import type { Task, FocusSession, Language } from '../types';
import { calculateDayStats, formatHoursMinutes } from '../utils/scheduler';
import {
  Target,
  Flame,
  Clock,
  CheckCircle2,
  Sparkles,
  Trophy,
  ArrowRight,
  Zap,
  Edit2,
  X,
  Check,
} from 'lucide-react';
import { t } from '../utils/i18n';
import confetti from 'canvas-confetti';

export { formatHoursMinutes };

export interface DailyGoalSummaryProps {
  tasks: Task[];
  focusSessions?: FocusSession[];
  dailyGoalMinutes?: number;
  onUpdateDailyGoal?: (mins: number) => void;
  lang?: Language;
  onOpenActiveFocus?: () => void;
}

export const DailyGoalSummary: React.FC<DailyGoalSummaryProps> = ({
  tasks = [],
  focusSessions = [],
  dailyGoalMinutes = 240,
  onUpdateDailyGoal,
  lang = 'en',
  onOpenActiveFocus,
}) => {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState(Math.round(dailyGoalMinutes / 60).toString());

  // Safe task counts
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const totalTasks = safeTasks.length;
  const completedTasks = safeTasks.filter(t => Boolean(t && t.completed)).length;

  // Strict dynamic progress calculation: (completed / total) * 100
  const rawPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const safePercent = Number.isFinite(rawPercent)
    ? Math.min(100, Math.max(0, Math.round(rawPercent)))
    : 0;

  // Calculate focused time for the current day
  const todayString = new Date().toDateString();

  // 1. Focus time recorded via real focus timer sessions today (excluding recharge breaks)
  const sessionMinutesToday = (Array.isArray(focusSessions) ? focusSessions : [])
    .filter(s => s && s.completedAt && s.type !== 'break' && new Date(s.completedAt).toDateString() === todayString)
    .reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);

  // 2. Focus time from completed focus tasks that were not logged as separate timer sessions
  const sessionTaskIds = new Set(
    (Array.isArray(focusSessions) ? focusSessions : [])
      .map(s => s?.taskId)
      .filter(Boolean)
  );

  const isFocusTask = (t: Task) =>
    t && (t.category === 'deep_work' || t.category === 'review' || t.category === 'admin');

  const taskCompletedFocusMinutes = safeTasks
    .filter(t => t && t.completed && isFocusTask(t) && !sessionTaskIds.has(t.id))
    .reduce((acc, t) => acc + (Number(t.actualDurationMinutes || t.durationMinutes) || 0), 0);

  const totalFocusedMinutes = sessionMinutesToday + taskCompletedFocusMinutes;
  const formattedFocusedTime = formatHoursMinutes(totalFocusedMinutes);

  // Effective daily goal (fallback to 240m = 4h default, flag if unconfigured)
  const isGoalCustomized = Number.isFinite(dailyGoalMinutes) && (dailyGoalMinutes ?? 0) > 0;
  const effectiveGoalMinutes = isGoalCustomized ? (dailyGoalMinutes as number) : 240;
  const formattedGoalTime = formatHoursMinutes(effectiveGoalMinutes);

  // Remaining focus time until goal
  const remainingFocusMinutes = Math.max(0, effectiveGoalMinutes - totalFocusedMinutes);
  const formattedRemainingTime = formatHoursMinutes(remainingFocusMinutes);
  const isGoalReached = totalFocusedMinutes >= effectiveGoalMinutes;

  // Focus time percentage relative to daily focus target
  const focusTimePercent = Math.min(
    100,
    Math.max(0, Math.round((totalFocusedMinutes / effectiveGoalMinutes) * 100))
  );

  // Day Stats & Motivation Engine
  const stats = calculateDayStats(safeTasks);
  const localizedMotivation = safePercent === 100 && totalTasks > 0
    ? t('goalAchievedMessage', lang)
    : isGoalReached
    ? t('goalAchievedMessage', lang)
    : safePercent >= 75
    ? t('finalStretch', lang)
    : safePercent >= 50
    ? t('halfwayThere', lang)
    : safePercent > 0
    ? t('solidMomentum', lang)
    : t('readyToConquer', lang);

  // SVG Circular progress ring calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius; // ~175.9
  const strokeDashoffset = circumference - (safePercent / 100) * circumference;

  const handleCelebrate = () => {
    try {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback if canvas is unavailable
    }
  };

  return (
    <section
      aria-label="Daily Goal Summary"
      className="w-full rounded-xl border border-border-default bg-surface-panel p-4 shadow-sm transition-all duration-200"
    >
      {/* Background ambient decorative glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Banner: Goal Target & Motivational Prompt */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Target className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
              {t('dailyGoalMomentum', lang)}
            </span>
            <p className="text-xs sm:text-sm font-semibold text-text-primary leading-snug truncate">
              {localizedMotivation}
            </p>
          </div>
        </div>

        {/* Milestone or Score badge */}
        <div className="self-start sm:self-auto shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated text-blue-400 border border-border-default text-xs font-semibold shadow-sm">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('focusScore', lang)}: {stats.focusScore}</span>
        </div>
      </div>

      {/* Task Completion Progress Card */}
      <div className="mt-4 rounded-lg border border-border-default bg-surface-elevated/50 p-3.5 shadow-inner">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2 font-semibold text-text-primary">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('dailyTaskCompletion', lang)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">
              <strong className="text-emerald-400 font-mono">{completedTasks}</strong> {t('of', lang)}{' '}
              <strong className="text-text-primary font-mono">{totalTasks}</strong> {t('tasks', lang)}
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/30">
              {safePercent}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full bg-surface-hover rounded-full h-2.5 overflow-hidden p-0.5 border border-border-default">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 transition-all duration-500 ease-out relative"
            style={{ width: `${safePercent}%` }}
          >
            {safePercent > 5 && (
              <span className="absolute inset-y-0 right-1 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow animateandroidpulse" />
              </span>
            )}
          </div>
        </div>

        {/* Milestone Marks */}
        <div className="flex items-center justify-between text-[9px] text-text-muted font-mono mt-1.5 px-0.5">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Metric Details Grid: Circular Task Breakdown + Total Focused Time */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
        {/* Metric Card 1: Task Completion Breakdown */}
        <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-elevated/80 p-3">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-surface-hover"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-emerald-400 transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-extrabold font-mono text-text-primary leading-tight">
                {safePercent}%
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-text-primary">
              {t('taskCompletionStatus', lang)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              <span className="font-semibold text-emerald-400">{completedTasks}</span> {t('of', lang)}{' '}
              <span className="font-semibold text-text-secondary">{totalTasks}</span> {t('completed', lang)}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
              <span>{Math.max(0, totalTasks - completedTasks)} {t('pendingToday', lang)}</span>
            </div>
          </div>
        </div>

        {/* Metric Card 2: Total Focused Time */}
        <div className="rounded-lg border border-border-default bg-surface-elevated/80 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                {t('totalFocusedTime', lang)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomGoalInput(Math.round(effectiveGoalMinutes / 60).toString());
                    setIsGoalModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 active:scale-[0.97]"
                  title="Configure daily focus time target"
                >
                  <Target className="w-2.5 h-2.5" />
                  <span>{t('setDailyGoal', lang)}</span>
                </button>

                <span className="font-mono text-xs font-bold text-blue-400">
                  {formattedFocusedTime}{' '}
                  <span className="text-text-muted font-normal">/ {formattedGoalTime}{!isGoalCustomized ? ' (default)' : ''}</span>
                </span>
              </div>
            </div>

            {/* Focus Time Progress Bar */}
            <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden mb-2 border border-border-default">
              <div
                className={`h-2 rounded-full transition-all duration-500 ease-out ${
                  isGoalReached
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${focusTimePercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
              <span>{formattedFocusedTime}</span>
              <span>{formattedRemainingTime} {t('remaining', lang)}</span>
            </div>
          </div>

          {/* Goal reached indicator */}
          {isGoalReached && totalTasks > 0 && (
            <button
              onClick={handleCelebrate}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold animate-bounce cursor-pointer shadow-sm transition"
              title="Celebrate goal completion!"
            >
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>{t('goalCleared', lang)}</span>
            </button>
          )}
          {!isGoalReached && totalTasks > 0 && (
            <button
              onClick={() => onOpenActiveFocus && onOpenActiveFocus()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold transition cursor-pointer hover:bg-blue-600/30"
              title="Launch focus timer for current active task"
            >
              <span>{t('focus', lang)}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Set Daily Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animatefadein duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-panel p-6 shadow-xl relative animatezoomin duration-200">
            <div className="flex items-center justify-between border-b border-border-default pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{t('dailyGoalLabel', lang)}</h3>
                  <p className="text-[11px] text-text-muted">{t('dailyGoalDesc', lang)}</p>
                </div>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Preset Hours */}
            <div>
              <label className="text-[10px] font-semibold text-text-muted block mb-3">
                Quick Presets:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { hours: 2, mins: 120 },
                  { hours: 3, mins: 180 },
                  { hours: 4, mins: 240, rec: true },
                  { hours: 5, mins: 300 },
                  { hours: 6, mins: 360 },
                  { hours: 8, mins: 480 },
                ].map(opt => (
                  <button
                    key={opt.mins}
                    type="button"
                    onClick={() => {
                      if (onUpdateDailyGoal) onUpdateDailyGoal(opt.mins);
                      setIsGoalModalOpen(false);
                    }}
                    className={`p-2.5 rounded-lg text-xs font-medium border transition cursor-pointer relative ${
                      effectiveGoalMinutes === opt.mins
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm font-bold shadow-blue-500/20'
                        : 'bg-surface-base text-text-secondary border-border-default hover:border-border-focused'
                    }`}
                  >
                    <span>{opt.hours} {t('goalHours', lang)}</span>
                    {opt.rec && (
                      <span className="block text-[9px] text-blue-200/80 font-normal">
                        (Default)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mt-4 border-t border-border-default pt-4">
              <label className="text-[10px] font-semibold text-text-muted block mb-2">
                Custom Focus Target (hours):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max="16"
                  step="0.5"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  className="flex-1 rounded-lg border border-border-default bg-surface-base px-3 py-2 text-xs font-mono text-text-primary focus:border-border-focused focus:ring-1 focus:ring-border-focused focus:outline-none placeholder-text-muted"
                  placeholder="e.g. 4"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsedHrs = parseFloat(customGoalInput);
                    if (Number.isFinite(parsedHrs) && parsedHrs > 0) {
                      const mins = Math.round(parsedHrs * 60);
                      if (onUpdateDailyGoal) onUpdateDailyGoal(mins);
                      setIsGoalModalOpen(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition active:scale-[0.97] cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('saveGoal', lang)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DailyGoalSummary;
