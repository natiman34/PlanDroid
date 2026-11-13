import React, { useState } from 'react';
import type { WorkScheduleConfig } from '../types';
import { X, Sliders, RefreshCw, Clock, Coffee, ShieldAlert, Check } from 'lucide-react';

interface ScheduleOptimizerModalProps {
  config: WorkScheduleConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: WorkScheduleConfig) => void;
  onTriggerRebalance: () => void;
}

export const ScheduleOptimizerModal: React.FC<ScheduleOptimizerModalProps> = ({
  config,
  isOpen,
  onClose,
  onSaveConfig,
  onTriggerRebalance,
}) => {
  if (!isOpen) return null;

  const [workStart, setWorkStart] = useState(config.workStart);
  const [workEnd, setWorkEnd] = useState(config.workEnd);
  const [bufferMinutes, setBufferMinutes] = useState(config.bufferMinutes);
  const [lunchStart, setLunchStart] = useState(config.lunchStart);
  const [lunchDuration, setLunchDuration] = useState(config.lunchDuration);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      workStart,
      workEnd,
      bufferMinutes,
      lunchStart,
      lunchDuration,
    });
    onClose();
  };

  const handleRebalanceClick = () => {
    onTriggerRebalance();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Close schedule settings"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Schedule & Optimizer Engine</h3>
            <p className="text-xs text-slate-400">Configure offline workday boundaries & buffer rules</p>
          </div>
        </div>

        {/* Rebalance Callout Banner */}
        <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-800/60 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Running Behind Schedule?
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Auto-shift remaining tasks forward without overlaps.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRebalanceClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition active:scale-95 cursor-pointer shrink-0"
          >
            Rebalance Day
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Workday Start
              </label>
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Workday End
              </label>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Lunch Start Time
              </label>
              <input
                type="time"
                value={lunchStart}
                onChange={(e) => setLunchStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Lunch Duration
              </label>
              <select
                value={lunchDuration}
                onChange={(e) => setLunchDuration(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Cognitive Buffer Spacing Between Tasks
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setBufferMinutes(mins)}
                  className={`py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                    bufferMinutes === mins
                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
