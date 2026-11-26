import React, { useState } from 'react';
import type { Task, TaskCategory, TaskPriority } from '../types';
import { parseNaturalTaskInput } from '../utils/scheduler';
import { t } from '../utils/i18n';
import {
  Sparkles,
  Plus,
  Clock,
  Flame,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
  Briefcase,
  Zap,
} from 'lucide-react';

interface TaskSuggestionBarProps {
  onAddAndScheduleTask: (taskPartial: Partial<Task>) => void;
}

const QUICK_SUGGESTIONS = [
  { label: '30m Daily Sync', query: 'Daily team sync 30m medium morning meeting' },
  { label: '60m Deep Focus', query: 'Deep focus coding session 60m urgent morning deep_work' },
  { label: '45m Code Review', query: 'PR code review and architectural feedback 45m high review' },
  { label: '20m Inbox Zero', query: 'Triage customer support emails 20m low afternoon admin' },
  { label: '15m Coffee Break', query: 'Mental refresh and walk 15m break' },
];

export const TaskSuggestionBar: React.FC<TaskSuggestionBarProps> = ({
  onAddAndScheduleTask,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customCategory, setCustomCategory] = useState<TaskCategory>('deep_work');
  const [customPriority, setCustomPriority] = useState<TaskPriority>('medium');
  const [isFixedTime, setIsFixedTime] = useState(false);

  // Live NLP parsed tokens
  const parsed = parseNaturalTaskInput(inputVal);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = (parsed.title || inputVal).trim();
    if (!title) return;

    const newTask: Partial<Task> = {
      title,
      durationMinutes: parsed.durationMinutes || 30,
      priority: showAdvanced ? customPriority : (parsed.priority || 'medium'),
      energyLevel: parsed.energyLevel || 'medium',
      category: showAdvanced ? customCategory : (parsed.category || 'deep_work'),
      preferredSlot: parsed.preferredSlot || 'any',
      isFixedTime: showAdvanced && isFixedTime && !!customStartTime,
      startTime: showAdvanced && isFixedTime ? customStartTime : undefined,
    };

    onAddAndScheduleTask(newTask);
    setInputVal('');
    setCustomStartTime('');
    setIsFixedTime(false);
    setShowAdvanced(false);
  };

  const handleApplyPreset = (presetQuery: string) => {
    setInputVal(presetQuery);
  };

  return (
    <div className="w-full rounded-xl border border-border-default bg-surface-panel shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold text-text-primary tracking-wide uppercase">
            {t('suggestTask', 'en')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
        >
          <span>{showAdvanced ? t('simple', 'en') : t('advancedOptions', 'en')}</span>
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Main input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. Audit Q3 metrics 45m urgent morning..."
              className="fieldinput text-[11px]"
            />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="flex items-center gap-1.5 px-3 py-2 btnprimary text-xs disabled:opacity-50 disabled:pointer-events-none shrink-0"
          >
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">{t('autoSchedule', 'en')}</span>
            <span className="sm:hidden">{t('addShort', 'en')}</span>
          </button>
        </div>

        {/* Live Detected Heuristic Tags (Feedback as user types) */}
        {inputVal.trim() && (
          <div className="flex flex-wrap items-center gap-1 text-[9px] bg-surface-hover p-2 rounded-lg border border-border-default">
            <span className="text-text-muted">Detected:</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/40 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {parsed.durationMinutes} min
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-900/30 text-indigo-400 border border-indigo-500/40 flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5" />
              {parsed.priority} {t('priority', 'en')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary border border-border-default flex items-center gap-0.5">
              <Briefcase className="w-2.5 h-2.5" />
              {parsed.category?.replace('_', ' ')}
            </span>
            {parsed.preferredSlot && parsed.preferredSlot !== 'any' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-500/40 flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {parsed.preferredSlot}
              </span>
            )}
          </div>
        )}

        {/* Advanced Manual Controls */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border-default text-[9px] animatefadein duration-200">
            <div>
              <label className="fieldlabel">{t('category', 'en')}</label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as TaskCategory)}
                className="fieldselect"
              >
                <option value="deep_work">{t('deepWorkFocus', 'en')}</option>
                <option value="meeting">{t('meetingCall', 'en')}</option>
                <option value="review">{t('reviewQA', 'en')}</option>
                <option value="admin">{t('adminEmail', 'en')}</option>
                <option value="break">{t('breakWellness', 'en')}</option>
                <option value="personal">{t('personal', 'en')}</option>
              </select>
            </div>

            <div>
              <label className="fieldlabel">{t('priority', 'en')}</label>
              <select
                value={customPriority}
                onChange={(e) => setCustomPriority(e.target.value as TaskPriority)}
                className="fieldselect"
              >
                <option value="urgent">{t('urgentP0', 'en')}</option>
                <option value="high">{t('highP1', 'en')}</option>
                <option value="medium">{t('mediumP2', 'en')}</option>
                <option value="low">{t('lowP3', 'en')}</option>
              </select>
            </div>

            <div>
              <label className="fieldlabel">{t('lockExactTime', 'en')}</label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => {
                    setCustomStartTime(e.target.value);
                    if (e.target.value) setIsFixedTime(true);
                  }}
                  className="flex-1 fieldinput text-[9px] font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-0.5">
          <span className="text-[9px] text-text-muted shrink-0 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            {t('presets', 'en')}
          </span>
          {QUICK_SUGGESTIONS.map((sugg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyPreset(sugg.query)}
              className="px-2 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary border border-border-default text-[9px] font-medium whitespace-nowrap transition cursor-pointer active:scale-[0.97]"
            >
              {sugg.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};

export default TaskSuggestionBar;
