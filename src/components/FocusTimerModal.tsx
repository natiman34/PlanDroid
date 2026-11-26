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
    setIsAlarmPlaying(false);

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

  // Active Timer Interval Tick
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
          const elapsed = Math.max(0, Math.round((Date.now() - stopwatchStartedAtRef.current) / 1000));
          setStopwatchSeconds(elapsed);
        }

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

  const handleToggleTimer = () => {
    if (isRunning) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animatefadein duration-200">
      <div className="w-full max-w-[340px] rounded-2xl border border-border-default bg-surface-panel shadow-xl relative max-h-[92vh] overflow-y-auto outline-none">
        {/* Top Header Controls */}
        <div className="flex items-center justify-end gap-1 -mt-1 mb-3">
          <button
            type="button"
            onClick={() => {
              stopFocusAudio();
              setIsAudioPlaying(false);
              onClose();
            }}
            aria-label="Minimize focus timer"
            title="Minimize to floating timer bar"
            className="btnicon btnghost size-8 text-text-muted hover:text-text-primary hover:bg-surface-hover"
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
            className="btnicon btnghost size-8 text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Chips */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              if (isRunning) return;
              setTimerMode('countdown');
              setSecondsLeft(initialTotalSeconds);
            }}
            disabled={isRunning}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              timerMode === 'countdown'
                ? 'btnprimary'
                : 'btnghost text-text-muted hover:text-text-primary'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              timerMode === 'stopwatch'
                ? 'btnsecondary'
                : 'btnghost text-text-muted hover:text-text-primary'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              sessionType === 'break'
                ? 'btnsuccess'
                : 'btnghost text-text-muted hover:text-text-primary'
            } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Toggle focus or short break session"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{sessionType === 'break' ? 'Break' : 'Focus'}</span>
          </button>
        </div>

        {/* Task Header */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${
            sessionType === 'break'
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
          }`}>
            {sessionType === 'break' ? <Coffee className="w-3 h-3 text-emerald-400" /> : <Flame className="w-3 h-3 text-amber-400" />}
            {sessionType === 'break' ? 'Recharge Break' : t('deepFocusTimer', lang)}
          </span>
          <h3 className="text-sm font-bold text-text-primary truncate px-2">
            {task.title}
          </h3>
          <div className="flex items-center justify-center gap-3 text-[10px] text-text-muted mt-1">
            <span>Est: {task.durationMinutes}m</span>
            <span className="w-[1px] h-3 bg-border-default"></span>
            <span className="text-blue-400 font-semibold">Actual: {task.actualDurationMinutes || 0}m</span>
          </div>
        </div>

        {/* 1-Minute Warning Banner */}
        {showOneMinWarning && !isCompleted && (
          <div className="mb-3 py-2 px-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10">
            <Bell className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t('oneMinuteRemaining', lang)}</span>
          </div>
        )}

        {/* Completion Confirmation Dialog inside Timer */}
        {isCompleted ? (
          <div className="my-3 p-5 rounded-2xl bg-gradient-to-b from-surface-elevated to-emerald-900/30 border border-emerald-800/40 space-y-4 animatezoomin duration-200 shadow-xl">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-amber-500/20 animateping" />
              <div className="relative w-14 h-14 rounded-full bg-amber-500/25 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Bell className="w-6 h-6 text-amber-400" />
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-text-primary">
                {sessionType === 'break' ? 'Break Finished!' : t('timerFinished', lang)}
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                {sessionType === 'break'
                  ? 'Time to jump back into action!'
                  : 'Great work! Would you like to mark this task complete now?'}
              </p>
            </div>

            {isAlarmPlaying && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400 animateandroidpulse shrink-0" />
                  <span className="font-bold">{t('alarmRinging', lang)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleStopAlarmSound}
                  className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold transition cursor-pointer active:scale-[0.97]"
                >
                  {t('stopAlarm', lang)}
                </button>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmMarkComplete}
                className="w-full py-3 px-4 btnprimary text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Task Complete</span>
              </button>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSnooze(5)}
                  className="py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Snooze 5m</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartBreak(5)}
                  className="py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Take 5m Break</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDismissWithoutCompleting}
                className="w-full py-2 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary text-xs font-medium transition cursor-pointer border border-border-default"
              >
                Keep Incomplete & Dismiss
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SVG Circular Countdown / Stopwatch Ring */}
            <div className="relative w-48 h-48 mx-auto my-3 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-surface-hover"
                />
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

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-5xl font-extrabold font-mono text-text-primary tracking-tight">
                  {formattedTime}
                </span>
                <span className="text-xs font-medium text-text-muted mt-1 uppercase tracking-wider">
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
                  className="btnicon btnoutline size-8 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="-5 min"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-text-muted font-mono">{t('adjustTime', lang)}</span>
                <button
                  type="button"
                  onClick={() => handleAdjustMinutes(5)}
                  aria-label="Add 5 minutes"
                  className="btnicon btnoutline size-8"
                  title="+5 min"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Focus Audio Ambient / Noise Loop Integration */}
            <div className="mb-4 p-3 rounded-lg border border-border-default bg-surface-elevated/50 text-left space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Focus Audio
                  </span>
                  {isAudioPlaying && selectedAudioTrack !== 'off' && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-900/30 border border-emerald-500/40 px-1.5 py-0.5 rounded-full">
                      Playing
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleAudioPlayback}
                  aria-label={isAudioPlaying ? 'Mute focus audio' : 'Play focus audio'}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                    isAudioPlaying
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                      : 'btnghost text-text-muted hover:text-text-primary'
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

              <div className="flex flex-wrap gap-1.5">
                {FOCUS_AUDIO_OPTIONS.map((option) => {
                  const isActive = selectedAudioTrack === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectAudioTrack(option.id)}
                      aria-pressed={isActive}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
                        isActive
                          ? option.id === 'off'
                            ? 'bg-surface-hover text-text-secondary border border-border-default'
                            : 'btnprimary'
                          : 'btnghost text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {selectedAudioTrack !== 'off' && (
                <div className="flex items-center gap-2.5 pt-0.5">
                  <Volume2 className="w-3 h-3 text-text-muted shrink-0" />
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={audioVolume}
                    onChange={(e) => handleAudioVolumeChange(parseFloat(e.target.value))}
                    aria-label="Focus Audio Volume"
                    className="flex-1 accent-blue-500 h-1.5 bg-surface-hover rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-text-muted w-8 text-right">
                    {Math.round(audioVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Primary Controls: Reset, Play/Pause, Mark Done */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                type="button"
                onClick={handleReset}
                className="btnicon btnoutline size-10"
                title={t('reset', lang)}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleTimer}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition active:scale-[0.97] cursor-pointer ${
                  isRunning
                    ? 'btnwarning'
                    : 'btnprimary'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>{t('pause', lang)}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>{t('start', lang)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleManualComplete}
                className="btnicon btnghost size-10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30"
                title={t('markDone', lang)}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary Controls: Early Stop with Accurate Time Log */}
            <div className="pt-2 border-t border-border-default flex items-center justify-center">
              <button
                type="button"
                onClick={handleStopEarly}
                className="text-[10px] text-text-muted hover:text-rose-400 transition cursor-pointer font-medium py-1 px-2 rounded-lg hover:bg-rose-900/20"
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
