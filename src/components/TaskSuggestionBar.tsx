import React, { useState } from 'react';
import type { Task, TaskCategory, TaskPriority } from '../types';
import { parseNaturalTaskInput } from '../utils/scheduler';
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
  Zap
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
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
            Suggest & Auto-Schedule Task
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition cursor-pointer"
        >
          <span>{showAdvanced ? 'Simple' : 'Advanced Options'}</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Auto-Schedule</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Live Detected Heuristic Tags (Feedback as user types) */}
        {inputVal.trim() && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
            <span className="text-slate-400">Detected:</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-800 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              {parsed.durationMinutes} min
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-800 flex items-center gap-1">
              <Flame className="w-3 h-3 text-indigo-400" />
              {parsed.priority} priority
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              {parsed.category?.replace('_', ' ')}
            </span>
            {parsed.preferredSlot && parsed.preferredSlot !== 'any' && (
              <span className="px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300 border border-teal-800 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-teal-400" />
                {parsed.preferredSlot}
              </span>
            )}
          </div>
        )}

        {/* Advanced Manual Controls */}
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800 text-xs animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-medium">Category</label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as TaskCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="deep_work">Deep Work / Focus</option>
                <option value="meeting">Meeting / Call</option>
                <option value="review">Review / QA</option>
                <option value="admin">Admin / Email</option>
                <option value="break">Break / Wellness</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-medium">Priority</label>
              <select
                value={customPriority}
                onChange={(e) => setCustomPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="urgent">Urgent (P0)</option>
                <option value="high">High (P1)</option>
                <option value="medium">Medium (P2)</option>
                <option value="low">Low (P3)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-medium">Lock Exact Time (Optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={customStartTime}
                  onChange={(e) => {
                    setCustomStartTime(e.target.value);
                    if (e.target.value) setIsFixedTime(true);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            Presets:
          </span>
          {QUICK_SUGGESTIONS.map((sugg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyPreset(sugg.query)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 text-[11px] text-slate-300 font-medium whitespace-nowrap transition cursor-pointer"
            >
              {sugg.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};
