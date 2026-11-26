import React, { useState, useMemo } from 'react';
import type { Habit, Language } from '../types';
import {
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Sparkles,
  Calendar,
  Bell,
  Award,
} from 'lucide-react';
import { t } from '../utils/i18n';
import {
  isHabitCompletedOnDate,
  toggleHabitForDate,
} from '../utils/habitUtils';
import { getTodayDateString, getWeekDays } from '../utils/dateUtils';
import { playSuccess } from '../utils/audio';
import confetti from 'canvas-confetti';

interface HabitsTrackerProps {
  habits: Habit[];
  onUpdateHabits: (habits: Habit[]) => void;
  lang?: Language;
}

const HABIT_COLORS = [
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ea580c', // Orange
];

type WeekDayDotProps = {
  day: { dateStr: string; dayName: string };
  habit: Habit;
  todayStr: string;
  habitColor: string;
  onToggle: (dateStr: string) => void;
};

const WeekDayDot: React.FC<WeekDayDotProps> = ({
  day,
  habit,
  todayStr,
  habitColor,
  onToggle,
}) => {
  const isComplete = isHabitCompletedOnDate(habit, day.dateStr);
  const isToday = day.dateStr === todayStr;
  const dotClass = isComplete
    ? 'text-white shadow-sm'
    : isToday
    ? 'bg-surface-hover border border-border-focused text-text-muted hover:border-border-focused'
    : 'bg-surface-hover border border-border-default text-text-muted hover:border-border-focused';

  return (
    <button
      key={day.dateStr}
      type="button"
      onClick={() => onToggle(day.dateStr)}
      title={`${day.dayName} (${day.dateStr}): ${isComplete ? 'Completed' : 'Missed'} (Click to toggle)`}
      className={`w-4 h-4 rounded-lg flex items-center justify-center text-[9px] font-bold transition cursor-pointer ${dotClass} ${isComplete ? `bg-[${habitColor}]` : ''}`}
    >
      {day.dayName[0]}
    </button>
  );
};

export const HabitsTracker: React.FC<HabitsTrackerProps> = ({
  habits = [],
  onUpdateHabits,
  lang = 'en',
}) => {
  const todayStr = useMemo(() => getTodayDateString(), []);
  const weekDays = useMemo(() => getWeekDays(todayStr, 1), [todayStr]); // Monday-Sunday

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [habitTitle, setHabitTitle] = useState('');
  const [targetDays, setTargetDays] = useState(7);
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0]);
  const [reminderTime, setReminderTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  // Today completion stats
  const todayCompletedCount = useMemo(() => {
    return habits.filter((h) => isHabitCompletedOnDate(h, todayStr)).length;
  }, [habits, todayStr]);

  const completionPercent = habits.length > 0
    ? Math.round((todayCompletedCount / habits.length) * 100)
    : 0;

  const handleToggleHabit = (habit: Habit, dateStr: string = todayStr) => {
    const isNowCompleted = !isHabitCompletedOnDate(habit, dateStr);
    if (isNowCompleted && dateStr === todayStr) {
      playSuccess();
      try {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
        });
      } catch {
        // safe fallback
      }
    }

    const updated = habits.map((h) =>
      h.id === habit.id ? toggleHabitForDate(h, dateStr, todayStr) : h
    );
    onUpdateHabits(updated);
  };

  const openCreateModal = () => {
    setEditingHabitId(null);
    setHabitTitle('');
    setTargetDays(7);
    setSelectedColor(HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)]);
    setReminderTime('');
    setReminderEnabled(false);
    setIsModalOpen(true);
  };

  const openEditModal = (h: Habit) => {
    setEditingHabitId(h.id);
    setHabitTitle(h.title);
    setTargetDays(h.targetDaysPerWeek || 7);
    setSelectedColor(h.color || HABIT_COLORS[0]);
    setReminderTime(h.reminderTime || '');
    setReminderEnabled(Boolean(h.reminderEnabled));
    setIsModalOpen(true);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    if (editingHabitId) {
      const updated = habits.map((h) => {
        if (h.id === editingHabitId) {
          return {
            ...h,
            title: habitTitle.trim(),
            targetDaysPerWeek: targetDays,
            color: selectedColor,
            reminderTime: reminderEnabled && reminderTime ? reminderTime : undefined,
            reminderEnabled,
          };
        }
        return h;
      });
      onUpdateHabits(updated);
    } else {
      const newHabit: Habit = {
        id: `habit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: habitTitle.trim(),
        category: 'deep_work',
        targetDaysPerWeek: targetDays,
        completedDates: [],
        createdAt: Date.now(),
        streak: 0,
        bestStreak: 0,
        color: selectedColor,
        reminderTime: reminderEnabled && reminderTime ? reminderTime : undefined,
        reminderEnabled,
      };
      onUpdateHabits([...habits, newHabit]);
    }

    setIsModalOpen(false);
    setEditingHabitId(null);
  };

  const confirmDelete = () => {
    if (!habitToDelete) return;
    const filtered = habits.filter((h) => h.id !== habitToDelete.id);
    onUpdateHabits(filtered);
    setHabitToDelete(null);
  };

  return (
    <section
      aria-label="Daily Habits & Routines"
      className="w-full pagesection space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Flame className="w-4.5 h-4.5 text-emerald-400 fill-emerald-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary">
                {t('dailyHabitsTitle', lang)}
              </h3>
              {habits.length > 0 && (
                <span className="text-[9px] font-mono font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-500/50 px-2 py-0.5 rounded-full">
                  {todayCompletedCount}/{habits.length} {t('done', lang)} ({completionPercent}%)
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-muted">{t('habitsDesc', lang)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="self-start sm:self-auto px-3 py-1.5 btnprimary text-[10px] flex items-center gap-1.5"
        >
          <Plus className="w-3 h-3" />
          <span>{t('addHabit', lang)}</span>
        </button>
      </div>

      {/* Habits Progress Bar if habits exist */}
      {habits.length > 0 && (
        <div className="w-full rounded-lg border border-border-default bg-surface-elevated/50 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-400" />
              {t('todayHabitMomentum', lang)}
            </span>
            <span className="font-mono text-xs font-bold text-blue-400">
              {completionPercent}%
            </span>
          </div>
          <div className="progresstrack">
            <div
              className="progressfill bg-gradient-to-r from-emerald-500 via-amber-500 to-blue-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {habits.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border-2 border-dashed border-border-default bg-surface-elevated/40">
          <Flame className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-text-primary">{t('noHabitsTracked', lang)}</h4>
          <p className="text-[10px] text-text-muted mt-1 max-w-sm mx-auto">
            {t('noHabitsDesc', lang)}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-3 px-3.5 py-1.5 btnprimary text-[10px]"
          >
            {t('createFirstHabit', lang)}
          </button>
        </div>
      ) : (
        /* Habits List */
        <div className="space-y-2">
          {habits.map((habit) => {
            const isDoneToday = isHabitCompletedOnDate(habit, todayStr);
            const habitColor = habit.color || '#3b82f6';

            return (
              <div
                key={habit.id}
                className={`p-3 rounded-lg border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDoneToday
                    ? 'bg-emerald-900/20 border-emerald-500/40'
                    : 'bg-surface-panel border-border-default hover:border-border-focused'
                }`}
              >
                {/* Left: Checkbox + Title + Streak */}
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleHabit(habit, todayStr)}
                    className="cursor-pointer shrink-0 transition-transform active:scale-[0.97]"
                    aria-label={isDoneToday ? `Mark ${habit.title} incomplete` : `Mark ${habit.title} completed today`}
                  >
                    {isDoneToday ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-text-muted hover:text-text-primary" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: habitColor }}
                      />
                      <span
                        className={`text-xs font-semibold text-text-primary truncate ${
                          isDoneToday ? 'line-through text-text-muted' : ''
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-text-muted">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                        <Flame className="w-3 h-3 fill-emerald-400" />
                        <span>{habit.streak || 0}d {t('streak', lang)}</span>
                      </span>
                      <span>•</span>
                      <span>{t('best', lang)}: {habit.bestStreak || 0}d</span>
                      {habit.reminderTime && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 font-mono">
                            <Bell className="w-2.5 h-2.5 text-blue-400" />
                            <span>{habit.reminderTime}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: 7-Day Mini Dot History + Edit/Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-default">
                  {/* 7-Day Week History Dots */}
                  <div className="flex items-center gap-1.5" title={t('pastSevenDaysHistory', lang)}>
                    {weekDays.map((d) => (
                      <WeekDayDot
                        key={d.dateStr}
                        day={d}
                        habit={habit}
                        todayStr={todayStr}
                        habitColor={habitColor}
                        onToggle={(dateStr) => handleToggleHabit(habit, dateStr)}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(habit)}
                      className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-surface-hover rounded-lg transition cursor-pointer"
                      title="Edit Habit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHabitToDelete(habit)}
                      className="p-1.5 text-text-muted hover:text-rose-400 hover:bg-surface-hover rounded-lg transition cursor-pointer"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Habit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animatefadein duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-panel p-6 shadow-xl relative animatezoomin duration-200">
            <div className="flex items-center justify-between border-b border-border-default pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-text-primary">
                  {editingHabitId ? t('editHabit', lang) : t('createNewHabit', lang)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btnicon btnghost size-8 text-text-muted hover:text-text-primary hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-4">
              <div>
                <label className="fieldlabel">{t('habitTitle', lang)} <span className="text-text-muted">*</span></label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g. Read 20 pages or 45m Deep Work"
                  className="fieldinput"
                />
              </div>

              {/* Target Days Per Week */}
              <div>
                <label className="fieldlabel">{t('targetFrequency', lang)}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t('everyday7d', lang), val: 7 },
                    { label: t('weekdays5d', lang), val: 5 },
                    { label: t('flexible3d', lang), val: 3 },
                  ].map((freq) => (
                    <button
                      key={freq.val}
                      type="button"
                      onClick={() => setTargetDays(freq.val)}
                      className={`p-2 rounded-lg text-[9px] font-medium transition cursor-pointer ${
                        targetDays === freq.val
                          ? 'btnprimary'
                          : 'btnghost text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="fieldlabel">{t('badgeColor', lang)}</label>
                <div className="flex gap-2">
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-6 h-6 rounded-lg transition cursor-pointer flex items-center justify-center ${
                        selectedColor === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Daily Reminder */}
              <div className="pt-2 border-t border-border-default space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[9px] font-semibold text-text-secondary flex items-center gap-1">
                    <Bell className="w-3 h-3 text-emerald-400" />
                    {t('dailyReminder', lang)}
                  </span>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="toggleswitch peer"
                  />
                </label>
                {reminderEnabled && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full fieldinput text-xs font-mono"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btnsecondary text-[10px]"
                >
                  {t('cancel', lang)}
                </button>
                <button
                  type="submit"
                  className="btnprimary text-[10px] flex items-center gap-1"
                >
                  {editingHabitId ? t('saveChanges', lang) : t('createHabit', lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {habitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animatefadein duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-panel p-6 shadow-xl">
            <p className="text-xs font-semibold text-text-primary">{t('deleteHabit', lang)} "{habitToDelete.title}"?</p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setHabitToDelete(null)}
                className="btnsecondary text-xs"
              >
                {t('cancel', lang)}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btndanger text-xs font-bold"
              >
                {t('delete', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HabitsTracker;
