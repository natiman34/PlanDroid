import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Task, FocusSession, NotificationSettings, Language, FocusAudioTrack } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
  Plus,
  Minus,
  Flame,
  Volume2,
  VolumeX,
  Bell,
  Timer,
  Clock,
  Coffee,
  Minimize2,
  Headphones,
} from 'lucide-react';
import {
  playSuccess,
  startAlarmLoop,
  stopAlarmLoop,
  playOneMinuteWarning,
  startFocusAudio,
  stopFocusAudio,
  setFocusAudioVolume,
} from '../utils/audio';
import {
  showActiveTimerNotification,
  showTimerCompletionNotification,
  closeNotificationByTag,
  TIMER_ACTIVE_TAG,
  TIMER_COMPLETED_TAG,
} from '../utils/notifications';
import {
  loadActiveTimerFromStorage,
  saveActiveTimerToStorage,
} from '../utils/storage';
import { t } from '../utils/i18n';
import confetti from 'canvas-confetti';

interface FocusTimerModalProps {
  task: Task | null;
  settings: NotificationSettings;
  lang: Language;
  autoStart?: boolean;
  onClose: () => void;
  onCompleteTask: (taskId: string) => void;
  onRecordFocusSession?: (session: Omit<FocusSession, 'id'>) => void;
  onUpdateTaskActualTime?: (taskId: string, additionalMinutes: number) => void;
  onStartNextSession?: () => void;
  onUpdateSettings?: (settings: NotificationSettings) => void;
}

const FOCUS_AUDIO_OPTIONS: Array<{ id: FocusAudioTrack; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'brown_noise', label: 'Brown Noise' },
  { id: 'white_noise', label: 'White Noise' },
  { id: 'rain', label: 'Rain' },
  { id: 'alpha_wave', label: 'Alpha Tone' },
];

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  task,
  settings,
  lang,
  autoStart = false,
  onClose,
  onCompleteTask,
  onRecordFocusSession,
  onUpdateTaskActualTime,
  onUpdateSettings,
}) => {
  if (!task) return null;

  // Timer modes
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');

  const initialTotalSeconds = (sessionType === 'break' ? 5 : task.durationMinutes) * 60;

  // Initialize or restore timestamp-based timer state
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const saved = loadActiveTimerFromStorage();
    if (saved && saved.taskId === task.id && saved.mode !== 'stopwatch') {
      if (saved.isRunning) {
        const remaining = Math.max(0, Math.round((saved.targetEndTime - Date.now()) / 1000));
        return remaining;
      } else if (typeof saved.pausedRemainingSeconds === 'number') {
        return saved.pausedRemainingSeconds;
      }
    }
    return initialTotalSeconds;
  });

  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(() => {
    const saved = loadActiveTimerFromStorage();
    if (saved && saved.taskId === task.id && saved.mode === 'stopwatch') {
      if (saved.isRunning) {
        return Math.round((Date.now() - saved.startedAt) / 1000) + (saved.elapsedSeconds || 0);
      }
      return saved.elapsedSeconds || 0;
    }
    return 0;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    const saved = loadActiveTimerFromStorage();
    if (saved && saved.taskId === task.id) {
      if (saved.isRunning) {
        if (saved.mode === 'stopwatch') return true;
        const remaining = Math.round((saved.targetEndTime - Date.now()) / 1000);
        return remaining > 0;
      }
      return false;
    }
    return Boolean(autoStart);
  });

  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [showOneMinWarning, setShowOneMinWarning] = useState<boolean>(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);

  // Focus Audio ambient sound loop state
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<FocusAudioTrack>(
    () => settings.focusAudioTrack || 'off'
  );
  const [audioVolume, setAudioVolume] = useState<number>(
    () => settings.focusAudioVolume ?? 0.45
  );
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const targetEndTimeRef = useRef<number>(Date.now() + initialTotalSeconds * 1000);
  const stopwatchStartedAtRef = useRef<number>(Date.now() - stopwatchSeconds * 1000);
  const completionTriggeredRef = useRef<boolean>(false);
  const hasWarnedOneMinuteRef = useRef<boolean>(false);
  const lastNotifUpdateRef = useRef<number>(0);

  // Stop alarm loop and focus audio cleanly on unmount
  useEffect(() => {
    if (isRunning && selectedAudioTrack !== 'off') {
      const started = startFocusAudio(selectedAudioTrack, audioVolume);
      setIsAudioPlaying(started);
    }
    return () => {
      stopAlarmLoop();
      stopFocusAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync ref with saved state on mount or task change
  useEffect(() => {
    const saved = loadActiveTimerFromStorage();
    if (saved && saved.taskId === task.id) {
      if (saved.mode === 'stopwatch') {
        setTimerMode('stopwatch');
        stopwatchStartedAtRef.current = Date.now() - (saved.elapsedSeconds || 0) * 1000;
      } else {
        setTimerMode('countdown');
        if (saved.isRunning) {
          targetEndTimeRef.current = saved.targetEndTime;
        } else {
          targetEndTimeRef.current = Date.now() + secondsLeft * 1000;
        }
      }
      if (saved.type) {
        setSessionType(saved.type);
      }
    } else {
      targetEndTimeRef.current = Date.now() + secondsLeft * 1000;
    }
  }, [task.id]);

  // Handle Timer Completion Trigger
  const triggerCompletion = useCallback(() => {
    if (completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;
    setIsRunning(false);
    setIsCompleted(true);
    setSecondsLeft(0);

    // Save timer state as completed
    saveActiveTimerToStorage(null);
    stopFocusAudio();
    setIsAudioPlaying(false);

    // 1. Play configurable repeating alarm sound if enabled
    if (settings.timerAlarmEnabled) {
      setIsAlarmPlaying(true);
      startAlarmLoop(
        settings.timerAlarmSound,
        settings.alarmVolume,
        settings.alarmRepeatIntervalSeconds || 60
      );
    }

    // 2. Persistent notification until acknowledged
    showTimerCompletionNotification(task.title, lang);

    // 3. Confetti burst
    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback
    }

    // Accumulate tracked minutes
    const sessionMins = Math.max(1, Math.round(initialTotalSeconds / 60));
    if (onUpdateTaskActualTime && sessionType === 'focus') {
      onUpdateTaskActualTime(task.id, sessionMins);
    }

    // Record completed focus session
    if (onRecordFocusSession) {
      onRecordFocusSession({
        taskId: task.id,
        taskTitle: task.title,
        durationMinutes: sessionMins,
        completedAt: Date.now(),
        type: sessionType,
      });
    }
  }, [task, settings, lang, onRecordFocusSession, onUpdateTaskActualTime, initialTotalSeconds, sessionType]);

  // High-accuracy background clock calculation with visibility change listener
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (isRunning && !completionTriggeredRef.current) {
        if (timerMode === 'countdown') {
          const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
          setSecondsLeft(remaining);
          if (remaining <= 0) {
            triggerCompletion();
          }
        } else {
          // Stopwatch
          const elapsed = Math.max(0, Math.round((Date.now() - stopwatchStartedAtRef.current) / 1000));
          setStopwatchSeconds(elapsed);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isRunning, timerMode, triggerCompletion]);

  // Active Timer Interval Tick (runs every 500ms for smooth display)
  useEffect(() => {
    let interval: any = null;

    if (isRunning && !isCompleted) {
      interval = setInterval(() => {
        if (timerMode === 'countdown') {
          const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
          setSecondsLeft(remaining);

          // 1-minute warning check
          if (
            remaining <= 60 &&
            remaining > 0 &&
            !hasWarnedOneMinuteRef.current &&
            settings.oneMinuteWarningEnabled
          ) {
            hasWarnedOneMinuteRef.current = true;
            setShowOneMinWarning(true);
            playOneMinuteWarning(settings.alarmVolume);
            setTimeout(() => setShowOneMinWarning(false), 5000);
          }

          if (remaining <= 0) {
            clearInterval(interval);
            triggerCompletion();
          }
        } else {
          // Stopwatch mode
          const elapsed = Math.max(0, Math.round((Date.now() - stopwatchStartedAtRef.current) / 1000));
          setStopwatchSeconds(elapsed);
        }

        // Keep native notification updated periodically (every 10s)
        const now = Date.now();
        if (now - lastNotifUpdateRef.current > 10000) {
          lastNotifUpdateRef.current = now;
          const displaySec = timerMode === 'countdown' ? secondsLeft : stopwatchSeconds;
          const mins = Math.floor(displaySec / 60);
          const secs = displaySec % 60;
          const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          showActiveTimerNotification(task.title, formatted, lang);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isCompleted, timerMode, settings, task, lang, triggerCompletion, secondsLeft, stopwatchSeconds]);

  // Focus Audio selection & playback handlers
  const handleSelectAudioTrack = (track: FocusAudioTrack) => {
    setSelectedAudioTrack(track);
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        focusAudioTrack: track,
        focusAudioVolume: audioVolume,
      });
    }

    if (track === 'off') {
      stopFocusAudio();
      setIsAudioPlaying(false);
    } else {
      const started = startFocusAudio(track, audioVolume);
      setIsAudioPlaying(started);
    }
  };

  const handleToggleAudioPlayback = () => {
    if (isAudioPlaying) {
      stopFocusAudio();
      setIsAudioPlaying(false);
      return;
    }
    const trackToPlay = selectedAudioTrack === 'off' ? 'brown_noise' : selectedAudioTrack;
    if (selectedAudioTrack === 'off') {
      setSelectedAudioTrack(trackToPlay);
      if (onUpdateSettings) {
        onUpdateSettings({
          ...settings,
          focusAudioTrack: trackToPlay,
          focusAudioVolume: audioVolume,
        });
      }
    }
    const started = startFocusAudio(trackToPlay, audioVolume);
    setIsAudioPlaying(started);
  };

  const handleAudioVolumeChange = (nextVol: number) => {
    setAudioVolume(nextVol);
    setFocusAudioVolume(nextVol);
    if (onUpdateSettings) {
      onUpdateSettings({
        ...settings,
        focusAudioTrack: selectedAudioTrack,
        focusAudioVolume: nextVol,
      });
    }
  };

  // Toggle Timer Play/Pause
  const handleToggleTimer = () => {
    if (isRunning) {
      // PAUSING
      setIsRunning(false);
      stopFocusAudio();
      setIsAudioPlaying(false);
      if (timerMode === 'countdown') {
        const remaining = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
        setSecondsLeft(remaining);
        saveActiveTimerToStorage({
          taskId: task.id,
          taskTitle: task.title,
          targetEndTime: targetEndTimeRef.current,
          durationSeconds: initialTotalSeconds,
          pausedRemainingSeconds: remaining,
          isRunning: false,
          startedAt: Date.now(),
          mode: 'countdown',
          type: sessionType,
        });
      } else {
        const elapsed = Math.max(0, Math.round((Date.now() - stopwatchStartedAtRef.current) / 1000));
        setStopwatchSeconds(elapsed);
        saveActiveTimerToStorage({
          taskId: task.id,
          taskTitle: task.title,
          targetEndTime: 0,
          durationSeconds: 0,
          elapsedSeconds: elapsed,
          isRunning: false,
          startedAt: Date.now(),
          mode: 'stopwatch',
          type: sessionType,
        });
      }
    } else {
      // STARTING / RESUMING
      setIsRunning(true);
      if (selectedAudioTrack !== 'off') {
        const started = startFocusAudio(selectedAudioTrack, audioVolume);
        setIsAudioPlaying(started);
      }
      if (timerMode === 'countdown') {
        const target = Date.now() + secondsLeft * 1000;
        targetEndTimeRef.current = target;
        saveActiveTimerToStorage({
          taskId: task.id,
          taskTitle: task.title,
          targetEndTime: target,
          durationSeconds: initialTotalSeconds,
          isRunning: true,
          startedAt: Date.now(),
          mode: 'countdown',
          type: sessionType,
        });
      } else {
        stopwatchStartedAtRef.current = Date.now() - stopwatchSeconds * 1000;
        saveActiveTimerToStorage({
          taskId: task.id,
          taskTitle: task.title,
          targetEndTime: 0,
          durationSeconds: 0,
          elapsedSeconds: stopwatchSeconds,
          isRunning: true,
          startedAt: stopwatchStartedAtRef.current,
          mode: 'stopwatch',
          type: sessionType,
        });
      }
    }
  };

  // Reset Timer
  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    completionTriggeredRef.current = false;
    hasWarnedOneMinuteRef.current = false;
    setShowOneMinWarning(false);
    stopAlarmLoop();
    stopFocusAudio();
    setIsAudioPlaying(false);
    setIsAlarmPlaying(false);

    if (timerMode === 'countdown') {
      setSecondsLeft(initialTotalSeconds);
      targetEndTimeRef.current = Date.now() + initialTotalSeconds * 1000;
    } else {
      setStopwatchSeconds(0);
      stopwatchStartedAtRef.current = Date.now();
    }
    saveActiveTimerToStorage(null);
  };

  // Stop early & log actual tracked time
  const handleStopEarly = () => {
    stopAlarmLoop();
    stopFocusAudio();
    setIsAudioPlaying(false);
    setIsAlarmPlaying(false);
    closeNotificationByTag(TIMER_ACTIVE_TAG);

    let loggedSeconds = 0;
    if (timerMode === 'countdown') {
      loggedSeconds = Math.max(0, initialTotalSeconds - secondsLeft);
    } else {
      loggedSeconds = stopwatchSeconds;
    }

    const loggedMinutes = Math.round(loggedSeconds / 60);
    if (loggedMinutes > 0) {
      if (onUpdateTaskActualTime && sessionType === 'focus') {
        onUpdateTaskActualTime(task.id, loggedMinutes);
      }
      if (onRecordFocusSession) {
        onRecordFocusSession({
          taskId: task.id,
          taskTitle: task.title,
          durationMinutes: loggedMinutes,
          completedAt: Date.now(),
          type: sessionType,
        });
      }
    }

    saveActiveTimerToStorage(null);
    onClose();
  };

  const handleAdjustMinutes = (delta: number) => {
    if (timerMode === 'stopwatch') return;
    setSecondsLeft((prev) => {
      const next = Math.max(60, prev + delta * 60);
      if (isRunning) {
        targetEndTimeRef.current = Date.now() + next * 1000;
      }
      return next;
    });
  };

  const handleManualComplete = () => {
    playSuccess();
    triggerCompletion();
  };

  const handleStopAlarmSound = () => {
    stopAlarmLoop();
    setIsAlarmPlaying(false);
  };

  const handleSnooze = (minutes = 5) => {
    stopAlarmLoop();
    setIsAlarmPlaying(false);
    closeNotificationByTag(TIMER_COMPLETED_TAG);
    setIsCompleted(false);
    completionTriggeredRef.current = false;
    hasWarnedOneMinuteRef.current = false;
    setShowOneMinWarning(false);

    const snoozeSecs = minutes * 60;
    setSecondsLeft(snoozeSecs);
    targetEndTimeRef.current = Date.now() + snoozeSecs * 1000;
    setIsRunning(true);
  };

  // Confirmation actions upon completion:
  const handleConfirmMarkComplete = () => {
    stopAlarmLoop();
    setIsAlarmPlaying(false);
    closeNotificationByTag(TIMER_COMPLETED_TAG);
    saveActiveTimerToStorage(null);
    onCompleteTask(task.id);
    onClose();
  };

  const handleDismissWithoutCompleting = () => {
    stopAlarmLoop();
    setIsAlarmPlaying(false);
    closeNotificationByTag(TIMER_COMPLETED_TAG);
    saveActiveTimerToStorage(null);
    onClose();
  };

  const handleStartBreak = (breakMinutes = 5) => {
    stopAlarmLoop();
    setIsAlarmPlaying(false);
    closeNotificationByTag(TIMER_COMPLETED_TAG);
    setIsCompleted(false);
    completionTriggeredRef.current = false;
    hasWarnedOneMinuteRef.current = false;

    setSessionType('break');
    setTimerMode('countdown');
    const breakSecs = breakMinutes * 60;
    setSecondsLeft(breakSecs);
    targetEndTimeRef.current = Date.now() + breakSecs * 1000;
    setIsRunning(true);
  };

  // Time format display
  const displaySecs = timerMode === 'countdown' ? secondsLeft : stopwatchSeconds;
  const mins = Math.floor(displaySecs / 60);
  const secs = displaySecs % 60;
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  // SVG Circular progress
  const totalSecs = Math.max(1, initialTotalSeconds);
  const fraction = timerMode === 'countdown'
    ? Math.max(0, Math.min(1, 1 - secondsLeft / totalSecs))
    : Math.min(1, (stopwatchSeconds % 3600) / 3600);
  const strokeDashoffset = 565.48 * (1 - fraction);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-center max-h-[92vh] overflow-y-auto">
        {/* Top Header Controls: Minimize & Close */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              stopFocusAudio();
              setIsAudioPlaying(false);
              onClose();
            }}
            aria-label="Minimize focus timer"
            title="Minimize to floating timer bar"
            className="p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              stopAlarmLoop();
              stopFocusAudio();
              setIsAudioPlaying(false);
              onClose();
            }}
            aria-label={t('cancel', lang)}
            className="p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Chips */}
        <div className="flex items-center justify-center gap-2 mb-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (isRunning) return;
              setTimerMode('countdown');
              setSecondsLeft(initialTotalSeconds);
            }}
            disabled={isRunning}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              timerMode === 'countdown'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Countdown</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isRunning) return;
              setTimerMode('stopwatch');
            }}
            disabled={isRunning}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              timerMode === 'stopwatch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Stopwatch</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isRunning) return;
              const nextType = sessionType === 'focus' ? 'break' : 'focus';
              setSessionType(nextType);
              setSecondsLeft((nextType === 'break' ? 5 : task.durationMinutes) * 60);
            }}
            disabled={isRunning}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              sessionType === 'break'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Toggle focus or short break session"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{sessionType === 'break' ? 'Break' : 'Focus'}</span>
          </button>
        </div>

        {/* Task Header */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 border ${
            sessionType === 'break'
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
              : 'bg-blue-950 text-blue-400 border-blue-800/80'
          }`}>
            {sessionType === 'break' ? <Coffee className="w-3.5 h-3.5 text-emerald-400" /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
            {sessionType === 'break' ? 'Recharge Break' : t('deepFocusTimer', lang)}
          </span>
          <h3 className="text-base font-bold text-slate-100 truncate px-4">
            {task.title}
          </h3>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mt-1">
            <span>Est: {task.durationMinutes}m</span>
            <span>•</span>
            <span className="text-blue-400 font-semibold">
              Actual: {task.actualDurationMinutes || 0}m
            </span>
          </div>
        </div>

        {/* 1-Minute Warning Banner */}
        {showOneMinWarning && !isCompleted && (
          <div className="mb-3 py-2 px-3.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 animate-bounce shadow-lg shadow-amber-500/10">
            <Bell className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t('oneMinuteRemaining', lang)}</span>
          </div>
        )}

        {/* Completion Confirmation Dialog inside Timer */}
        {isCompleted ? (
          <div className="my-3 p-5 bg-gradient-to-b from-slate-900 to-emerald-950/60 border border-emerald-800/80 rounded-3xl space-y-4 animate-in zoom-in-95 shadow-2xl">
            {/* Pulsing Bell Indicator */}
            <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping" />
              <div className="relative w-12 h-12 rounded-2xl bg-amber-500/25 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Bell className="w-6 h-6 text-amber-400" />
              </div>
            </div>

            <div>
              <h4 className="text-base font-extrabold text-slate-100">
                {sessionType === 'break' ? 'Break Finished!' : t('timerFinished', lang)}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {sessionType === 'break'
                  ? 'Time to jump back into action!'
                  : 'Great work! Would you like to mark this task complete now?'}
              </p>
            </div>

            {/* Sustained Alarm Audio Status Bar */}
            {isAlarmPlaying && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/50 border border-amber-600/50 text-amber-200 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                  <span className="font-bold">{t('alarmRinging', lang)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleStopAlarmSound}
                  className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  {t('stopAlarm', lang)}
                </button>
              </div>
            )}

            {/* Explicit Completion Confirmation Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmMarkComplete}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Task Complete</span>
              </button>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSnooze(5)}
                  className="py-2 px-3 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded-xl font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Snooze 5 Min</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartBreak(5)}
                  className="py-2 px-3 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/40 rounded-xl font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Take 5m Break</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDismissWithoutCompleting}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Keep Incomplete & Dismiss
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SVG Circular Countdown / Stopwatch Ring */}
            <div className="relative w-52 h-52 mx-auto my-3 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Background ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-800"
                />
                {/* Progress ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={565.48}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className={`${
                    sessionType === 'break' ? 'text-emerald-500' : 'text-blue-500'
                  } transition-all duration-300 ease-linear`}
                />
              </svg>

              {/* Time Display inside Ring */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
                  {formattedTime}
                </span>
                <span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
                  {isRunning ? (sessionType === 'break' ? 'Recharging...' : t('focusingStatus', lang)) : displaySecs === 0 ? t('completedStatus', lang) : t('pausedStatus', lang)}
                </span>
              </div>
            </div>

            {/* Adjust Minutes (+/- 5m) - only in countdown */}
            {timerMode === 'countdown' && (
              <div className="flex items-center justify-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(-5)}
                  disabled={secondsLeft <= 60}
                  aria-label="Subtract 5 minutes"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="-5 min"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 font-mono">{t('adjustTime', lang)}</span>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(5)}
                  aria-label="Add 5 minutes"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="+5 min"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Focus Audio Ambient / Noise Loop Integration */}
            <div
              data-testid="focus-audio-panel"
              className="mb-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-left space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Focus Audio
                  </span>
                  {isAudioPlaying && selectedAudioTrack !== 'off' && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-1.5 py-0.5 rounded-full">
                      Playing
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleAudioPlayback}
                  aria-label={isAudioPlaying ? 'Mute focus audio' : 'Play focus audio'}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                    isAudioPlaying
                      ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/70'
                  }`}
                >
                  {isAudioPlaying ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>On</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Muted</span>
                    </>
                  )}
                </button>
              </div>

              {/* Ambient Sound Loop Options */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {FOCUS_AUDIO_OPTIONS.map((option) => {
                  const isActive = selectedAudioTrack === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectAudioTrack(option.id)}
                      aria-pressed={isActive}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer truncate ${
                        isActive
                          ? option.id === 'off'
                            ? 'bg-slate-700 text-slate-100 border border-slate-500'
                            : 'bg-indigo-600 text-white border border-indigo-400 shadow-sm shadow-indigo-600/30'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {/* Volume Control */}
              {selectedAudioTrack !== 'off' && (
                <div className="flex items-center gap-2.5 pt-0.5">
                  <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={audioVolume}
                    onChange={(e) => handleAudioVolumeChange(parseFloat(e.target.value))}
                    aria-label="Focus Audio Volume"
                    className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-9 text-right">
                    {Math.round(audioVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Primary Controls: Reset, Play/Pause, Mark Done */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <button
                type="button"
                onClick={handleReset}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title={t('reset', lang)}
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleToggleTimer}
                className={`px-8 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>{t('pause', lang)}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>{t('start', lang)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleManualComplete}
                className="p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 transition cursor-pointer"
                title={t('markDone', lang)}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

            {/* Secondary Controls: Early Stop with Accurate Time Log */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center">
              <button
                type="button"
                onClick={handleStopEarly}
                className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer font-medium py-1 px-3 rounded-lg hover:bg-rose-950/20"
                title="Stop timer and log elapsed minutes spent so far"
              >
                {t('stopEarly', lang)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FocusTimerModal;
