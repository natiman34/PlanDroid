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
      className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Daily Habits & Routines
              </h3>
              {habits.length > 0 && (
                <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {todayCompletedCount}/{habits.length} Done ({completionPercent}%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Build daily momentum and consistent deep focus streaks
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="self-start sm:self-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Habit</span>
        </button>
      </div>

      {/* Habits Progress Bar if habits exist */}
      {habits.length > 0 && (
        <div className="w-full bg-slate-950/80 rounded-xl p-2.5 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Today's Habit Momentum</span>
            </span>
            <span className="font-mono text-xs font-bold text-amber-400">
              {completionPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              style={{ width: `${completionPercent}%` }}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 h-full rounded-full transition-all duration-500"
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {habits.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <Flame className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No habits tracked yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Form positive habits like Morning Planning, 45m Deep Work, or Daily Review to build unstoppable streaks.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition cursor-pointer"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        /* Habits List */
        <div className="space-y-2.5">
          {habits.map((habit) => {
            const isDoneToday = isHabitCompletedOnDate(habit, todayStr);
            const habitColor = habit.color || '#3b82f6';

            return (
              <div
                key={habit.id}
                className={`p-3 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDoneToday
                    ? 'bg-slate-950/80 border-emerald-500/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Left: Checkbox + Title + Streak */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleHabit(habit, todayStr)}
                    className="cursor-pointer shrink-0 transition-transform active:scale-95"
                    aria-label={isDoneToday ? `Mark ${habit.title} incomplete` : `Mark ${habit.title} completed today`}
                  >
                    {isDoneToday ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: habitColor }}
                      />
                      <span
                        className={`text-xs font-semibold text-slate-100 truncate ${
                          isDoneToday ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 text-amber-400 font-semibold font-mono">
                        <Flame className="w-3 h-3 fill-amber-400" />
                        <span>{habit.streak || 0}d streak</span>
                      </span>
                      <span>•</span>
                      <span>Best: {habit.bestStreak || 0}d</span>
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
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  {/* 7-Day Week History Dots */}
                  <div className="flex items-center gap-1.5" title="Past 7 days completion history">
                    {weekDays.map((d) => {
                      const isComplete = isHabitCompletedOnDate(habit, d.dateStr);
                      const isToday = d.dateStr === todayStr;

                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          onClick={() => handleToggleHabit(habit, d.dateStr)}
                          title={`${d.dayName} (${d.dateStr}): ${isComplete ? 'Completed' : 'Missed'} (Click to toggle)`}
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold transition cursor-pointer ${
                            isComplete
                              ? 'text-white shadow-sm'
                              : isToday
                              ? 'bg-slate-800 border border-slate-600 text-slate-400 hover:border-slate-500'
                              : 'bg-slate-900 border border-slate-800 text-slate-600 hover:border-slate-700'
                          }`}
                          style={{
                            backgroundColor: isComplete ? habitColor : undefined,
                          }}
                        >
                          {d.dayName[0]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(habit)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Edit Habit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHabitToDelete(habit)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Delete Habit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {editingHabitId ? 'Edit Habit' : 'Create New Habit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHabit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Habit Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g. Read 20 pages or 45m Deep Work"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Target Days Per Week */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Target Frequency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Everyday (7d)', val: 7 },
                    { label: 'Weekdays (5d)', val: 5 },
                    { label: 'Flexible (3d)', val: 3 },
                  ].map((freq) => (
                    <button
                      key={freq.val}
                      type="button"
                      onClick={() => setTargetDays(freq.val)}
                      className={`p-2 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                        targetDays === freq.val
                          ? 'bg-blue-600 text-white border-blue-500 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Badge Color
                </label>
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
                      {selectedColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Daily Reminder */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Bell className="w-3 h-3 text-amber-400" />
                    <span>Daily Reminder</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded bg-slate-950 border-slate-700"
                  />
                </label>
                {reminderEnabled && (
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
                >
                  {editingHabitId ? 'Save Changes' : 'Create Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {habitToDelete && (
        <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-2 animate-in fade-in">
          <p className="text-xs text-rose-300 font-semibold">
            Delete habit "{habitToDelete.title}"?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setHabitToDelete(null)}
              className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HabitsTracker;
