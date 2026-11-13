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
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs transition-all">
        <div className="flex items-center gap-2 text-slate-400">
          <PinOff className="w-4 h-4 text-slate-500" />
          <span>Active task pin is paused.</span>
        </div>
        <button
          onClick={handleTogglePin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition cursor-pointer"
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Pin Active Task</span>
        </button>
      </div>
    );
  }

  return (
    <section 
      aria-label="Active Task Card"
      className="w-full bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 shadow-sm relative overflow-hidden"
    >
      {/* Header with status pill and sound toggle */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-semibold text-slate-200">Current Pinned Plan</span>
          <span className="text-slate-600">•</span>
          <span className="text-blue-400 font-mono text-[11px]">Active</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bar status feedback */}
          {nativePinStatus && (
            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 animate-in fade-in">
              {nativePinStatus}
            </span>
          )}

          <button
            onClick={handleToggleSound}
            aria-label={settings.soundEnabled ? 'Mute notification chimes' : 'Unmute notification chimes'}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title={settings.soundEnabled ? 'Chimes enabled' : 'Chimes muted'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={handleTogglePin}
            aria-label="Unpin task"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="Unpin current plan"
          >
            <PinOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Content or All Completed State */}
      {activeTask ? (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800/80">
                  {activeTask.startTime} - {activeTask.endTime}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  activeTask.priority === 'urgent' ? 'bg-rose-950 text-rose-300 border border-rose-800/80' :
                  activeTask.priority === 'high' ? 'bg-amber-950 text-amber-300 border border-amber-800/80' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {activeTask.priority}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {activeTask.durationMinutes}m
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-100 truncate tracking-tight">
                {activeTask.title}
              </h3>
              {activeTask.notes && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{activeTask.notes}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
              {/* Push to Android Notification bar button */}
              <button
                onClick={handlePinToAndroidNotification}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700/80 text-blue-400 border border-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer"
                title="Pin this plan to phone notification area"
              >
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Notification Bar</span>
              </button>

              {/* Focus button */}
              <button
                onClick={() => onOpenFocusModal(activeTask)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                title="Launch Deep Focus Timer"
              >
                <Timer className="w-4 h-4 text-white" />
                <span>Focus</span>
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800/80">
            <button
              onClick={handleCompleteActive}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Done</span>
            </button>

            <button
              onClick={handleSnooze}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition active:scale-95 cursor-pointer"
              title="Add 15 minutes to this plan"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>+15m Snooze</span>
            </button>

            {pendingTasks.length > 1 && (
              <button
                onClick={handleNextTask}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition active:scale-95 cursor-pointer"
              >
                <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                <span>Next Plan</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">All planned tasks completed!</h4>
              <p className="text-xs text-slate-400">Great work today. You can create more plans anytime.</p>
            </div>
          </div>
          <button
            onClick={handleTogglePin}
            className="text-xs text-slate-400 hover:text-slate-200 p-1.5"
          >
            <PinOff className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};
