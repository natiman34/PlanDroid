import React, { useState } from 'react';
import type { Task, NotificationSettings } from '../types';
import {
  Pin,
  PinOff,
  CheckCircle2,
  SkipForward,
  Timer,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Bell,
  Check,
} from 'lucide-react';
import { playSuccess } from '../utils/audio';
import { pinPlanToNotification, unpinPlanNotification, getNotificationStatus } from '../utils/notifications';
import { t } from '../utils/i18n';

interface PinnedNotificationDrawerProps {
  tasks: Task[];
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: NotificationSettings) => void;
  onCompleteTask: (taskId: string) => void;
  onSnoozeTask: (taskId: string, extraMinutes: number) => void;
  onOpenFocusModal: (task: Task) => void;
}

export const PinnedNotificationDrawer: React.FC<PinnedNotificationDrawerProps> = ({
  tasks,
  settings,
  onUpdateSettings,
  onCompleteTask,
  onSnoozeTask,
  onOpenFocusModal,
}) => {
  const [nativePinStatus, setNativePinStatus] = useState<string | null>(null);

  // If no tasks exist in the app, do not show the pinned drawer
  if (tasks.length === 0) {
    return null;
  }

  // Determine current active task: first incomplete task with startTime
  const activeTask = tasks.find(t => !t.completed && t.startTime) || null;
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const handleTogglePin = () => {
    const nextPinned = !settings.isPinned;
    onUpdateSettings({ ...settings, isPinned: nextPinned });
    if (nextPinned) {
      if (activeTask) {
        pinPlanToNotification(activeTask);
      }
    } else {
      unpinPlanNotification();
    }
  };

  const handleToggleSound = () => {
    onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  const handleCompleteActive = () => {
    if (!activeTask) return;
    if (settings.soundEnabled && settings.taskCompletionSound) playSuccess();
    onCompleteTask(activeTask.id);
  };

  const handleSnooze = () => {
    if (!activeTask) return;
    onSnoozeTask(activeTask.id, 15);
  };

  const handleNextTask = () => {
    if (!activeTask || pendingTasks.length <= 1) return;
    onSnoozeTask(activeTask.id, 30);
  };

  // Push notification to Android status bar
  const handlePinToAndroidNotification = async () => {
    if (!activeTask) return;
    const success = await pinPlanToNotification(activeTask);
    if (success) {
      setNativePinStatus('Pinned to Phone Notifications');
      setTimeout(() => setNativePinStatus(null), 3000);
    } else {
      const status = getNotificationStatus();
      if (!status.isSupported) {
        setNativePinStatus('Pinned on screen (Browser notifications not supported)');
      } else {
        setNativePinStatus('Please allow notification permission in your browser');
      }
      setTimeout(() => setNativePinStatus(null), 4000);
    }
  };

  // If unpinned, show a compact unobtrusive bar
  if (!settings.isPinned) {
    return (
      <div className="w-full rounded-xl border border-border-default bg-surface-elevated p-3 flex items-center justify-between text-[10px] text-text-muted transition-all">
        <div className="flex items-center gap-1.5">
          <PinOff className="w-3.5 h-3.5" />
          <span>{t('pinPaused', 'en')}</span>
        </div>
        <button
          onClick={handleTogglePin}
          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer active:scale-[0.97]"
        >
          <Pin className="w-3 h-3" />
          <span>{t('pinActiveTask', 'en')}</span>
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label={t('activeTaskCard', 'en')}
      className="w-full rounded-xl border border-border-default bg-surface-panel p-4 shadow-sm relative overflow-hidden"
    >
      {/* Header with status pill and sound toggle */}
      <div className="flex items-center justify-between text-[10px] text-text-muted mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animateandroidpulse" />
          <span className="font-semibold text-text-primary">{t('currentPinnedPlan', 'en')}</span>
          <span className="text-text-muted">•</span>
          <span className="text-blue-400 font-mono text-[10px]">{t('activeStatus', 'en')}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Notification bar status feedback */}
          {nativePinStatus && (
            <span className="text-[9px] text-emerald-400 font-medium bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-500/40 animatefadein">
              {nativePinStatus}
            </span>
          )}

          <button
            onClick={handleToggleSound}
            aria-label={settings.soundEnabled ? 'Mute notification chimes' : 'Unmute notification chimes'}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary transition cursor-pointer"
            title={settings.soundEnabled ? 'Chimes enabled' : 'Chimes muted'}
          >
            {settings.soundEnabled ? <Volume2 className="w-3 h-3 text-blue-400" /> : <VolumeX className="w-3 h-3" />}
          </button>

          <button
            onClick={handleTogglePin}
            aria-label={t('unpinTask', 'en')}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-rose-400 transition cursor-pointer"
            title="Unpin current plan"
          >
            <PinOff className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Task Content or All Completed State */}
      {activeTask ? (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-1.5 mb-1">
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-blue-900/20 text-blue-400 border border-blue-500/40`}>
                  {activeTask.startTime} - {activeTask.endTime}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    activeTask.priority === 'urgent'
                      ? 'bg-rose-900 text-rose-400 border border-rose-800/50'
                      : activeTask.priority === 'high'
                      ? 'bg-amber-900 text-amber-400 border border-amber-800/50'
                      : 'bg-surface-hover text-text-muted border border-border-default'
                  }`}
                >
                  {activeTask.priority}
                </span>
                <span className="text-[9px] text-text-muted flex items-center gap-0.5">
                  <Clock className="w-3 h-3 text-text-muted" />
                  {activeTask.durationMinutes}m
                </span>
              </div>
              <h3 className="text-sm font-bold text-text-primary truncate tracking-tight">{activeTask.title}</h3>
              {activeTask.notes && (
                <p className="text-[10px] text-text-muted truncate mt-0.5">{activeTask.notes}</p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto">
              {/* Push to Android Notification bar button */}
              <button
                onClick={handlePinToAndroidNotification}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary border border-border-default text-[9px] font-medium transition active:scale-[0.97] cursor-pointer"
                title="Pin this plan to phone notification area"
              >
                <Bell className="w-3 h-3 text-blue-400" />
                <span className="hidden sm:inline">{t('notificationBar', 'en')}</span>
              </button>

              {/* Focus button */}
              <button
                onClick={() => onOpenFocusModal(activeTask)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-semibold shadow-sm shadow-indigo-600/20 transition active:scale-[0.97] cursor-pointer"
                title="Launch Deep Focus Timer"
              >
                <Timer className="w-3 h-3 text-white" />
                <span>{t('focus', 'en')}</span>
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-1.5 mt-3 pt-2 border-t border-border-default">
            <button
              onClick={handleCompleteActive}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-semibold shadow-sm shadow-emerald-500/20 transition active:scale-[0.97] cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{t('markDone', 'en')}</span>
            </button>

            <button
              onClick={handleSnooze}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary border border-border-default text-[9px] font-medium transition active:scale-[0.97] cursor-pointer"
              title="Add 15 minutes to this plan"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{t('snooze15m', 'en')}</span>
            </button>

            {pendingTasks.length > 1 && (
              <button
                onClick={handleNextTask}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary border border-border-default text-[9px] font-medium transition active:scale-[0.97] cursor-pointer"
              >
                <SkipForward className="w-3 h-3 text-text-muted" />
                <span>{t('nextPlan', 'en')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary">{t('allTasksCompleted', 'en')}</h4>
              <p className="text-[10px] text-text-muted">{t('greatWorkToday', 'en')}</p>
            </div>
          </div>
          <button
            onClick={handleTogglePin}
            className="text-[10px] text-text-muted hover:text-text-primary p-1.5"
          >
            <PinOff className="w-3 h-3" />
          </button>
        </div>
      )}
    </section>
  );
};

export default PinnedNotificationDrawer;
