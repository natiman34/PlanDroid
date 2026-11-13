import React from 'react';
import { Play, Pause, Square, Maximize2, Coffee, Flame } from 'lucide-react';
import type { ActiveTimerState, Language } from '../types';

interface FloatingActiveTimerProps {
  timerState: ActiveTimerState;
  secondsDisplay: number;
  onPauseResume: () => void;
  onStop: () => void;
  onExpand: () => void;
  lang?: Language;
}

export const FloatingActiveTimer: React.FC<FloatingActiveTimerProps> = ({
  timerState,
  secondsDisplay,
  onPauseResume,
  onStop,
  onExpand,
  lang = 'en',
}) => {
  const isStopwatch = timerState.mode === 'stopwatch';
  const isBreak = timerState.type === 'break';

  const formatSeconds = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <aside
      aria-label="Active Timer Floating Bar"
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-slate-900/95 border border-blue-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Indicator & Task Info */}
        <button
          type="button"
          onClick={onExpand}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
          title="Click to expand focus timer"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            isBreak
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          }`}>
            {isBreak ? <Coffee className="w-4 h-4" /> : <Flame className="w-4 h-4 text-amber-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${timerState.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isBreak ? 'Break' : (isStopwatch ? 'Stopwatch' : 'Timer')} • {timerState.isRunning ? 'Running' : 'Paused'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-100 truncate group-hover:text-blue-300 transition">
              {timerState.taskTitle}
            </p>
          </div>
        </button>

        {/* Center: Time digits */}
        <div className="text-right px-2">
          <span className="font-mono text-base font-bold text-slate-100 tracking-tight">
            {formatSeconds(secondsDisplay)}
          </span>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPauseResume}
            className={`p-2 rounded-xl text-white transition active:scale-95 cursor-pointer ${
              timerState.isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title={timerState.isRunning ? 'Pause' : 'Resume'}
          >
            {timerState.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="p-2 bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-800 rounded-xl transition cursor-pointer"
            title="Stop timer"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExpand}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="Expand timer view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
