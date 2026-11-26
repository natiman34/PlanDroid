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
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 rounded-2xl border border-border-default bg-surface-panel p-3 shadow-xl backdrop-blur-lg slidedownin duration-200"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Indicator & Task Info */}
        <button
          type="button"
          onClick={onExpand}
          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
          title="Click to expand focus timer"
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
            isBreak
              ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/40'
              : 'bg-blue-900/30 text-blue-400 border-blue-500/40'
          }`}>
            {isBreak ? <Coffee className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${timerState.isRunning ? 'bg-emerald-400 animateandroidpulse' : 'bg-text-muted'}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                {isBreak ? 'Recharge Break' : (isStopwatch ? 'Stopwatch' : 'Focus Timer')} • {timerState.isRunning ? 'Running' : 'Paused'}
              </span>
            </div>
            <p className="text-xs font-semibold text-text-primary truncate group-hover:text-blue-400 transition">
              {timerState.taskTitle}
            </p>
          </div>
        </button>

        {/* Center: Time digits */}
        <div className="text-right px-2">
          <span className="font-mono text-base font-bold text-text-primary tracking-tight">
            {formatSeconds(secondsDisplay)}
          </span>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onPauseResume}
            className={`p-2 rounded-lg text-white transition active:scale-[0.97] cursor-pointer ${
              timerState.isRunning ? 'btnwarning' : 'btnsuccess'
            }`}
            title={timerState.isRunning ? 'Pause' : 'Resume'}
          >
            {timerState.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="p-2 rounded-lg btnghost text-text-muted hover:text-rose-400 hover:bg-rose-900/30 transition cursor-pointer"
            title="Stop timer"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onExpand}
            className="p-2 rounded-lg btnghost text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
            title="Expand timer view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default FloatingActiveTimer;
