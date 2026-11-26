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
  Minus,
  Layers,
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
  initialDate?: string;
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
  const [viewportMaxHeight, setViewportMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const updateHeight = () => {
      setViewportMaxHeight(Math.max(260, Math.floor(vv.height - 20)));
    };
    updateHeight();
    vv.addEventListener('resize', updateHeight);
    vv.addEventListener('scroll', updateHeight);
    return () => {
      vv.removeEventListener('resize', updateHeight);
      vv.removeEventListener('scroll', updateHeight);
    };
  }, [isOpen]);

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

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart && durationMinutes > 0) {
      setEndTime(calculateEndTimeFromDuration(newStart, durationMinutes));
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime && newEnd) {
      const dur = calculateDurationFromTimes(startTime, newEnd);
      setDurationMinutes(dur);
    }
  };

  const handleDurationSelect = (mins: number) => {
    setDurationMinutes(mins);
    if (startTime) {
      setEndTime(calculateEndTimeFromDuration(startTime, mins));
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animatefadein duration-200">
      <div
        style={viewportMaxHeight ? { maxHeight: `${viewportMaxHeight}px` } : undefined}
        className="w-full max-w-lg rounded-2xl border border-border-default bg-surface-panel shadow-xl overflow-hidden flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border-default bg-surface-panel shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              {initialTask ? <Calendar className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-blue-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                {initialTask ? t('editPlanTitle', lang) : t('newPlanTitle', lang)}
              </h3>
              <p className="text-[10px] text-text-muted">
                {formatReadableDate(date, { includeYear: true })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('cancel', lang)}
            className="btnicon btnghost size-8 text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form id="plan-form-modal-form" onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Plan Title */}
          <div>
            <label className="fieldlabel">
              {t('planTitlePlaceholder', lang)} <span className="text-text-muted">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Architecture Review or Daily Workout"
              className="fieldinput"
            />
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="fieldlabel flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {t('scheduledDate', lang)}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="fieldinput text-xs font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="fieldlabel flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  {t('categoryTag', lang)}
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
                className="fieldselect"
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

          {/* Time & Duration */}
          <div className="p-3 rounded-lg border border-border-default bg-surface-elevated/50 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-text-muted">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('timeDuration', lang)}</span>
              </span>
              <span className="font-mono text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {durationMinutes} min
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">{t('startTime', lang)}</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="fieldinput text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-text-muted block mb-1">{t('endTime', lang)}</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="fieldinput text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-wider block mb-1.5">
                {t('quickDurationPresets', lang)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {durationPresets.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => handleDurationSelect(dur)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer border ${
                      durationMinutes === dur
                        ? 'btnprimary'
                        : 'btnghost text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {dur >= 60 ? `${dur / 60}h` : `${dur}m`}
                  </button>
                ))}
              </div>
            </div>

            {conflictingTasks.length > 0 && (
              <div className="p-2.5 rounded-lg border border-amber-500/50 bg-amber-900/10 flex items-start gap-2 text-xs text-amber-300 animatefadein duration-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-semibold text-amber-400 block">{t('schedulingConflict', lang)}</span>
                  <span className="text-[10px] text-amber-200/90">
                    {t('overlapsWith', lang)}: {conflictingTasks.map(t => `"${t.title}" (${t.startTime}-${t.endTime})`).join(', ')}.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="fieldlabel flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {t('priorityLabel', lang)}
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
                  className={`py-2 text-center rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                    priority === p.id
                      ? `${p.color} ring-1 ring-current font-bold shadow-sm`
                      : 'border-border-default bg-surface-base text-text-muted hover:border-border-focused'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2 px-3 rounded-lg border border-border-default bg-surface-elevated/50 text-text-muted hover:text-text-primary hover:bg-surface-hover text-xs font-medium transition cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('reminderRecurringSchedule', lang)}</span>
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="p-3 rounded-lg border border-border-default bg-surface-elevated/50 space-y-3 animatefadein duration-200">
              <div>
                <label className="fieldlabel flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  {t('taskReminder', lang)}
                </label>
                <select
                  value={reminderMinutesBefore}
                  onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                  className="fieldselect"
                >
                  <option value={-1}>{t('noReminder', lang)}</option>
                  <option value={0}>{t('atStartTime', lang)}</option>
                  <option value={5}>5 {t('minutesBefore', lang)}</option>
                  <option value={10}>10 {t('minutesBefore', lang)}</option>
                  <option value={15}>15 {t('minutesBefore', lang)}</option>
                  <option value={30}>30 {t('minutesBefore', lang)}</option>
                  <option value={60}>1 {t('hourBefore', lang)}</option>
                </select>
              </div>

              <div>
                <label className="fieldlabel flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-blue-400" />
                  {t('recurringActivity', lang)}
                </label>
                <select
                  value={recurrenceFreq}
                  onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFrequency)}
                  className="fieldselect"
                >
                  <option value="none">{t('oneTimeTask', lang)}</option>
                  <option value="daily">{t('everyDay', lang)}</option>
                  <option value="weekdays">{t('everyWeekday', lang)}</option>
                  <option value="weekly">{t('weekly', lang)} {formatReadableDate(date, { shortDay: true }).split(',')[0]}</option>
                </select>
              </div>

              <div>
                <label className="fieldlabel">{t('notesLabel', lang)}</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details, checklist or meeting links..."
                  className="fieldtextarea"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-border-default bg-surface-panel/95 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            className="btnsecondary btnmd text-[11px]"
          >
            {t('cancel', lang)}
          </button>
          <button
            type="submit"
            form="plan-form-modal-form"
            className="btnprimary btnmd text-[11px] flex items-center gap-1.5 whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{initialTask ? t('saveChanges', lang) : t('createPlan', lang)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanFormModal;
