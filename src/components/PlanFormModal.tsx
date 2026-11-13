import React, { useState, useEffect } from 'react';
import type { Task, TaskCategory, TaskPriority, EnergyLevel, Language, RecurrenceFrequency } from '../types';
import {
  X,
  Plus,
  Clock,
  Tag,
  Zap,
  Check,
  Bell,
  Calendar,
  Repeat,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { t } from '../utils/i18n';
import {
  getTodayDateString,
  calculateDurationFromTimes,
  calculateEndTimeFromDuration,
  formatReadableDate,
  findTaskConflictsForDate,
  doIntervalsOverlap,
} from '../utils/dateUtils';
import {
  type CustomCategory,
  DEFAULT_CUSTOM_CATEGORIES,
  getTaskCategory,
  getCategoryBadgeStyle,
  UNCATEGORIZED_CATEGORY,
} from '../utils/categoryUtils';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: Partial<Task>, pinImmediately?: boolean) => void;
  initialTask?: Task | null;
  initialDate?: string; // Preselect date when adding from a specific day in weekly view
  prefillData?: Partial<Task> | null;
  existingTasks?: Task[];
  defaultDuration?: number;
  lang?: Language;
  categories?: CustomCategory[];
  onOpenCategoryManager?: () => void;
}

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  initialDate,
  prefillData,
  existingTasks = [],
  defaultDuration = 30,
  lang = 'en',
  categories = DEFAULT_CUSTOM_CATEGORIES,
  onOpenCategoryManager,
}) => {
  const [title, setTitle] = useState(() => initialTask?.title || prefillData?.title || '');
  const [description, setDescription] = useState(() => initialTask?.description || initialTask?.notes || prefillData?.description || '');
  const [categoryId, setCategoryId] = useState<string>(() => {
    if (initialTask?.categoryId) return initialTask.categoryId;
    if (prefillData?.categoryId) return prefillData.categoryId;
    if (prefillData?.category === 'break') return 'cat-break';
    if (prefillData?.category === 'meeting') return 'cat-meeting';
    if ((prefillData?.category as string) === 'learning') return 'cat-learn';
    if (prefillData?.category === 'personal') return 'cat-personal';
    return categories[0]?.id || 'cat-work';
  });
  const [category, setCategory] = useState<TaskCategory>(() => initialTask?.category || prefillData?.category || 'deep_work');
  const [date, setDate] = useState<string>(() => initialTask?.date || prefillData?.date || initialDate || getTodayDateString());
  const [durationMinutes, setDurationMinutes] = useState<number>(() => initialTask?.durationMinutes || prefillData?.durationMinutes || defaultDuration);
  const [startTime, setStartTime] = useState(() => {
    if (initialTask?.startTime) return initialTask.startTime;
    const nowH = new Date().getHours();
    return `${String(Math.min(23, nowH + 1)).padStart(2, '0')}:00`;
  });
  const [endTime, setEndTime] = useState(() => {
    if (initialTask?.endTime) return initialTask.endTime;
    const nowH = new Date().getHours();
    const s = `${String(Math.min(23, nowH + 1)).padStart(2, '0')}:00`;
    const dur = initialTask?.durationMinutes || prefillData?.durationMinutes || defaultDuration;
    return calculateEndTimeFromDuration(s, dur);
  });
  const [priority, setPriority] = useState<TaskPriority>(() => initialTask?.priority || prefillData?.priority || 'medium');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(() => initialTask?.energyLevel || prefillData?.energyLevel || 'medium');
  const [preferredSlot, setPreferredSlot] = useState<'morning' | 'afternoon' | 'evening' | 'any'>(() => initialTask?.preferredSlot || prefillData?.preferredSlot || 'any');
  const [isFixedTime, setIsFixedTime] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(10);
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>('none');
  const [pinToNotifications, setPinToNotifications] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Populate form if editing existing task or when opened
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || initialTask.notes || '');
      const resolvedCat = getTaskCategory(initialTask, categories);
      setCategoryId(resolvedCat.id);
      setCategory(initialTask.category || 'deep_work');
      setDate(initialTask.date || initialDate || getTodayDateString());
      setDurationMinutes(initialTask.durationMinutes || defaultDuration);
      setPriority(initialTask.priority || 'medium');
      setEnergyLevel(initialTask.energyLevel || 'medium');
      setPreferredSlot(initialTask.preferredSlot || 'any');
      setIsFixedTime(initialTask.isFixedTime !== false);
      const s = initialTask.startTime || '09:00';
      setStartTime(s);
      setEndTime(initialTask.endTime || calculateEndTimeFromDuration(s, initialTask.durationMinutes || defaultDuration));
      setReminderMinutesBefore(
        typeof initialTask.reminderMinutesBefore === 'number'
          ? initialTask.reminderMinutesBefore
          : (initialTask.reminderEnabled ? 10 : -1)
      );
      setRecurrenceFreq(initialTask.recurrence?.frequency || 'none');
      setPinToNotifications(false);
      setShowAdvanced(Boolean(initialTask.recurrence?.frequency && initialTask.recurrence.frequency !== 'none'));
    } else {
      // Default clean values or prefill values for new plan
      const targetDuration = prefillData?.durationMinutes || defaultDuration;
      setTitle(prefillData?.title || '');
      setDescription(prefillData?.description || '');
      let defaultCatId = prefillData?.categoryId;
      if (!defaultCatId && prefillData?.category) {
        if (prefillData.category === 'break') defaultCatId = 'cat-break';
        else if (prefillData.category === 'meeting') defaultCatId = 'cat-meeting';
        else if ((prefillData.category as string) === 'learning') defaultCatId = 'cat-learn';
        else if (prefillData.category === 'personal') defaultCatId = 'cat-personal';
        else defaultCatId = 'cat-work';
      }
      if (!defaultCatId) defaultCatId = categories[0]?.id || 'cat-work';
      setCategoryId(defaultCatId);
      setCategory(prefillData?.category || 'deep_work');
      setDate(prefillData?.date || initialDate || getTodayDateString());
      setDurationMinutes(targetDuration);
      setPriority(prefillData?.priority || 'medium');
      setEnergyLevel(prefillData?.energyLevel || 'medium');
      setPreferredSlot(prefillData?.preferredSlot || 'any');
      setIsFixedTime(true);
      const nowH = new Date().getHours();
      const defaultStart = `${String(Math.min(23, nowH + 1)).padStart(2, '0')}:00`;
      setStartTime(defaultStart);
      setEndTime(calculateEndTimeFromDuration(defaultStart, targetDuration));
      setReminderMinutesBefore(10);
      setRecurrenceFreq('none');
      setPinToNotifications(true);
      setShowAdvanced(false);
    }
  }, [initialTask, initialDate, prefillData, isOpen, defaultDuration]);

  if (!isOpen) return null;

  // Handle start time change -> update end time keeping current duration
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && durationMinutes > 0) {
      setEndTime(calculateEndTimeFromDuration(newStart, durationMinutes));
    }
  };

  // Handle end time change -> calculate duration
  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const dur = calculateDurationFromTimes(startTime, newEnd);
      setDurationMinutes(dur);
    }
  };

  // Handle duration chip click -> adjust end time
  const handleDurationSelect = (mins: number) => {
    setDurationMinutes(mins);
    if (startTime) {
      setEndTime(calculateEndTimeFromDuration(startTime, mins));
    }
  };

  // Conflict detection on the chosen date
  const conflictingTasks = existingTasks.filter(t => {
    if (initialTask && t.id === initialTask.id) return false;
    if (t.date !== date) return false;
    if (!t.startTime || !t.endTime) return false;
    return doIntervalsOverlap(startTime, endTime, t.startTime, t.endTime);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        notes: description.trim() || undefined,
        category,
        categoryId,
        date,
        durationMinutes: Number(durationMinutes) || 30,
        priority,
        energyLevel,
        preferredSlot,
        isFixedTime,
        startTime,
        endTime,
        reminderEnabled: reminderMinutesBefore >= 0,
        reminderMinutesBefore: reminderMinutesBefore >= 0 ? reminderMinutesBefore : undefined,
        recurrence: recurrenceFreq !== 'none' ? { frequency: recurrenceFreq } : undefined,
      },
      pinToNotifications
    );
    onClose();
  };

  const durationPresets = [15, 30, 45, 60, 90, 120];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              {initialTask ? <Calendar className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {initialTask ? t('editPlanTitle', lang) : t('newPlanTitle', lang)}
              </h3>
              <p className="text-xs text-slate-400">
                {formatReadableDate(date, { includeYear: true })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('cancel', lang)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Plan Title */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {t('planTitlePlaceholder', lang)} *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Architecture Review or Daily Workout"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Date & Category in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Scheduled Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Category Tag</span>
                </label>
                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-medium cursor-pointer flex items-center gap-1"
                  >
                    <span>+ Manage</span>
                  </button>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategoryId(val);
                  if (val === 'cat-personal') setCategory('personal');
                  else if (val === 'cat-study') setCategory('review');
                  else if (val === 'cat-projects') setCategory('admin');
                  else setCategory('deep_work');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={UNCATEGORIZED_CATEGORY.id}>Uncategorized</option>
              </select>
            </div>
          </div>

          {/* Time & Duration Controls */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Time & Duration</span>
              </span>
              <span className="font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {durationMinutes} min
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quick Duration Preset Chips */}
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                Quick Duration Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {durationPresets.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => handleDurationSelect(dur)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer border ${
                      durationMinutes === dur
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {dur >= 60 ? `${dur / 60}h` : `${dur}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict Warning */}
            {conflictingTasks.length > 0 && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-600/50 rounded-xl flex items-start gap-2 text-xs text-amber-300 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-semibold block">Scheduling Conflict Detected</span>
                  <span className="text-[11px] text-amber-200/90">
                    Overlaps with: {conflictingTasks.map(t => `"${t.title}" (${t.startTime}-${t.endTime})`).join(', ')}.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Priority Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('priorityLabel', lang)}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'urgent', label: t('urgent', lang), color: 'border-rose-500 bg-rose-500/10 text-rose-400' },
                { id: 'high', label: t('high', lang), color: 'border-amber-500 bg-amber-500/10 text-amber-400' },
                { id: 'medium', label: t('medium', lang), color: 'border-blue-500 bg-blue-500/10 text-blue-400' },
                { id: 'low', label: t('low', lang), color: 'border-slate-500 bg-slate-500/10 text-slate-400' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as TaskPriority)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    priority === p.id
                      ? `${p.color} ring-1 ring-current font-bold`
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-blue-400" />
              <span>Reminder & Recurring Schedule</span>
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Advanced Section */}
          {showAdvanced && (
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-3 animate-in fade-in">
              {/* Reminder Options */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Task Reminder</span>
                </label>
                <select
                  value={reminderMinutesBefore}
                  onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={-1}>No Reminder</option>
                  <option value={0}>At Start Time</option>
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>

              {/* Recurring Schedule */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-blue-400" />
                  <span>Recurring Activity</span>
                </label>
                <select
                  value={recurrenceFreq}
                  onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFrequency)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="none">One-time Task (No Recurrence)</option>
                  <option value="daily">Every Day (Monday–Sunday)</option>
                  <option value="weekdays">Every Weekday (Monday–Friday)</option>
                  <option value="weekly">Weekly (Every {formatReadableDate(date, { shortDay: true }).split(',')[0]})</option>
                </select>
              </div>

              {/* Optional Description / Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('notesLabel', lang)}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details, checklist or meeting links..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              {t('cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialTask ? t('saveChanges', lang) : t('createPlan', lang)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanFormModal;
