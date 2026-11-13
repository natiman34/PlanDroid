import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, WorkScheduleConfig, NotificationSettings, FocusSession, TaskCategory, ActiveTimerState, Habit } from './types';
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  loadConfigFromStorage,
  saveConfigToStorage,
  loadNotificationSettings,
  saveNotificationSettings,
  loadFocusSessionsFromStorage,
  saveFocusSessionsToStorage,
  loadDailyGoalFromStorage,
  saveDailyGoalToStorage,
  loadActiveTimerFromStorage,
  saveActiveTimerToStorage,
  recoverFromIndexedDBIfEmpty,
} from './utils/storage';
import {
  autoScheduleTasks,
  rebalanceRemainingDay,
} from './utils/scheduler';
import { pinPlanToNotification, showTimerCompletionNotification } from './utils/notifications';
import { getTodayDateString } from './utils/dateUtils';
import { checkTaskReminders, snoozeReminder, type TriggeredReminder } from './utils/reminderService';
import { playAlarmSound } from './utils/audio';
import { t } from './utils/i18n';
import { loadHabitsFromStorage, saveHabitsToStorage } from './utils/habitUtils';
import { cycleTaskPriority } from './utils/reorderUtils';
import { resolveAppliedTheme, applyThemeToDocument } from './utils/themeUtils';

import { PinnedNotificationDrawer } from './components/PinnedNotificationDrawer';
import { TaskSuggestionBar } from './components/TaskSuggestionBar';
import { TimelineView } from './components/TimelineView';
import { KanbanView } from './components/KanbanView';
import { WeeklyPlannerView } from './components/WeeklyPlannerView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { BottomNavBar, type MainSection } from './components/BottomNavBar';
import { PlanFormModal } from './components/PlanFormModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { FocusTimerModal } from './components/FocusTimerModal';
import { ScheduleOptimizerModal } from './components/ScheduleOptimizerModal';
import { FloatingActiveTimer } from './components/FloatingActiveTimer';
import { GeminiChatModal } from './components/GeminiChatModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { calculateStreak } from './utils/streakUtils';
import {
  type CustomCategory,
  loadCategoriesFromStorage,
  saveCategoriesToStorage,
} from './utils/categoryUtils';

import {
  Calendar,
  Columns3,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  Bell,
  Clock,
  X,
  Flame,
  Bot,
  Tag,
} from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage());
  const [habits, setHabits] = useState<Habit[]>(() => loadHabitsFromStorage());
  const [categories, setCategories] = useState<CustomCategory[]>(() => loadCategoriesFromStorage());
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => loadFocusSessionsFromStorage());
  const [config, setConfig] = useState<WorkScheduleConfig>(() => loadConfigFromStorage());
  const [settings, setSettings] = useState<NotificationSettings>(() => loadNotificationSettings());
  const [mainSection, setMainSection] = useState<MainSection>('plans');
  const [plansSubView, setPlansSubView] = useState<'timeline' | 'kanban'>('timeline');

  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(() => loadDailyGoalFromStorage());
  const [timerAutoStart, setTimerAutoStart] = useState<boolean>(false);
  const [activeSessionPrompt, setActiveSessionPrompt] = useState<{
    pendingTask: Task;
    runningTitle: string;
  } | null>(null);

  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialPlanDate, setInitialPlanDate] = useState<string | undefined>(undefined);
  const [planPrefillData, setPlanPrefillData] = useState<Partial<Task> | null>(null);
  const [notificationBannerMsg, setNotificationBannerMsg] = useState<string | null>(null);

  // Background timer state for floating mini bar
  const [activeTimerState, setActiveTimerState] = useState<ActiveTimerState | null>(() => loadActiveTimerFromStorage());
  const [floatingSeconds, setFloatingSeconds] = useState<number>(0);

  // Fired task reminders toast list
  const [firedReminders, setFiredReminders] = useState<TriggeredReminder[]>([]);

  // Productivity Streak tracking (100% daily completion)
  const streakStats = useMemo(() => calculateStreak(tasks), [tasks]);

  const lang = settings.language || 'en';

  // Apply visual theme to document (dark / light / system with live OS change listener)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
      const resolved = resolveAppliedTheme(settings.theme, mediaQuery.matches);
      applyThemeToDocument(resolved);
    };

    syncTheme();

    if ((settings.theme || 'dark') === 'system') {
      mediaQuery.addEventListener('change', syncTheme);
      return () => mediaQuery.removeEventListener('change', syncTheme);
    }
  }, [settings.theme]);

  // IndexedDB startup recovery fallback if localStorage was cleared
  useEffect(() => {
    recoverFromIndexedDBIfEmpty().then((recovered) => {
      if (recovered) {
        if (recovered.tasks) setTasks(recovered.tasks);
        if (recovered.habits) setHabits(recovered.habits);
        if (recovered.categories) setCategories(recovered.categories);
        if (recovered.focusSessions) setFocusSessions(recovered.focusSessions);
      }
    });
  }, []);

  // Sync daily focus goal
  useEffect(() => {
    saveDailyGoalToStorage(dailyGoalMinutes);
  }, [dailyGoalMinutes]);

  // Sync tasks to storage
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  // Sync habits to storage
  useEffect(() => {
    saveHabitsToStorage(habits);
  }, [habits]);

  // Sync custom categories to storage
  useEffect(() => {
    saveCategoriesToStorage(categories);
  }, [categories]);

  // Sync focus sessions to storage
  useEffect(() => {
    saveFocusSessionsToStorage(focusSessions);
  }, [focusSessions]);

  // Sync config
  useEffect(() => {
    saveConfigToStorage(config);
  }, [config]);

  // Sync settings
  useEffect(() => {
    saveNotificationSettings(settings);
  }, [settings]);

  // Record a completed focus session
  const handleRecordFocusSession = useCallback((sessionData: Omit<FocusSession, 'id'>) => {
    const newSession: FocusSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...sessionData,
    };
    setFocusSessions(prev => [newSession, ...prev]);
  }, []);

  // Update actual duration spent on a task
  const handleUpdateTaskActualTime = useCallback((taskId: string, additionalMinutes: number) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            actualDurationMinutes: (t.actualDurationMinutes || 0) + additionalMinutes,
          };
        }
        return t;
      })
    );
  }, []);

  // Sync floating mini bar with stored active timer periodically & handle background timer completion
  useEffect(() => {
    const updateFloatingTimer = () => {
      const stored = loadActiveTimerFromStorage();
      setActiveTimerState(stored);

      if (stored && stored.isRunning) {
        if (stored.mode === 'stopwatch') {
          const now = Date.now();
          const runningElapsed = (stored.elapsedSeconds || 0) + Math.floor((now - (stored.startedAt || now)) / 1000);
          setFloatingSeconds(runningElapsed);
        } else {
          const remainingSec = Math.max(0, Math.round((stored.targetEndTime - Date.now()) / 1000));
          setFloatingSeconds(remainingSec);

          if (remainingSec <= 0 && !stored.hasTriggeredCompletion) {
            const updatedTimer: ActiveTimerState = {
              ...stored,
              isRunning: false,
              hasTriggeredCompletion: true,
            };
            saveActiveTimerToStorage(updatedTimer);
            setActiveTimerState(updatedTimer);

            if (settings.timerAlarmEnabled) {
              playAlarmSound(settings.timerAlarmSound, settings.alarmVolume);
            }
            showTimerCompletionNotification(stored.taskTitle, lang);

            const sessionMins = Math.max(1, Math.round((stored.durationSeconds || 1800) / 60));
            handleRecordFocusSession({
              taskId: stored.taskId,
              taskTitle: stored.taskTitle,
              durationMinutes: sessionMins,
              completedAt: Date.now(),
              type: stored.type || 'focus',
            });
            if (stored.type !== 'break') {
              handleUpdateTaskActualTime(stored.taskId, sessionMins);
            }
            setNotificationBannerMsg(`Focus session complete: "${stored.taskTitle}"!`);
          }
        }
      } else if (stored) {
        setFloatingSeconds(stored.elapsedSeconds || stored.pausedRemainingSeconds || 0);
      }
    };

    updateFloatingTimer();
    const interval = setInterval(updateFloatingTimer, 1000);
    return () => clearInterval(interval);
  }, [settings, lang, handleRecordFocusSession, handleUpdateTaskActualTime]);

  // Periodic Reminder Monitor: checks task start times & reminder offsets
  useEffect(() => {
    const monitorReminders = () => {
      const triggered = checkTaskReminders(tasks, settings, getTodayDateString());
      if (triggered.length > 0) {
        setFiredReminders(prev => [...triggered, ...prev].slice(0, 5));
        if (settings.timerAlarmEnabled) {
          playAlarmSound(settings.timerAlarmSound, settings.alarmVolume);
        }
      }
    };

    monitorReminders();
    const interval = setInterval(monitorReminders, 20000);
    return () => clearInterval(interval);
  }, [tasks, settings]);

  // Save new or edited plan
  const handleSavePlan = (planData: Partial<Task>, pinImmediately = false) => {
    if (editingTask) {
      // Editing existing plan
      setTasks(prev => {
        const updated = prev.map(t =>
          t.id === editingTask.id ? { ...t, ...planData } : t
        );
        return autoScheduleTasks(updated, config);
      });
      setNotificationBannerMsg(`Plan "${planData.title || editingTask.title}" updated.`);
      setEditingTask(null);
    } else {
      // Creating new plan
      const targetDate = planData.date || initialPlanDate || getTodayDateString();
      const newPlan: Task = {
        id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: planData.title || 'Untitled Plan',
        description: planData.description || '',
        category: planData.category || 'deep_work',
        date: targetDate,
        durationMinutes: planData.durationMinutes || config.defaultTaskDuration || 30,
        actualDurationMinutes: 0,
        priority: planData.priority || 'medium',
        energyLevel: planData.energyLevel || 'medium',
        preferredSlot: planData.preferredSlot || 'any',
        isFixedTime: planData.isFixedTime || false,
        startTime: planData.startTime,
        endTime: planData.endTime,
        completed: false,
        notes: planData.notes,
        recurrence: planData.recurrence,
        reminderMinutesBefore: planData.reminderMinutesBefore !== undefined ? planData.reminderMinutesBefore : config.defaultReminderMinutes,
        reminderEnabled: planData.reminderEnabled ?? true,
        createdAt: Date.now(),
      };

      setTasks(prev => {
        const combined = [...prev, newPlan];
        const scheduled = autoScheduleTasks(combined, config);

        if (pinImmediately) {
          const scheduledTask = scheduled.find(t => t.id === newPlan.id) || newPlan;
          pinPlanToNotification(scheduledTask);
        }

        return scheduled;
      });

      setNotificationBannerMsg(`"${newPlan.title}" created and scheduled.`);
    }

    setInitialPlanDate(undefined);
    setTimeout(() => setNotificationBannerMsg(null), 3000);
  };

  // Duplicate task to another day or today
  const handleDuplicateTask = useCallback((task: Task, targetDate?: string) => {
    const copyDate = targetDate || task.date || getTodayDateString();
    const duplicated: Task = {
      ...task,
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: `${task.title} (Copy)`,
      date: copyDate,
      completed: false,
      actualDurationMinutes: 0,
      completedAt: undefined,
      createdAt: Date.now(),
    };
    setTasks(prev => [...prev, duplicated]);
    setNotificationBannerMsg(`Task copied to ${copyDate}.`);
    setTimeout(() => setNotificationBannerMsg(null), 3000);
  }, []);

  // Quick starter helper
  const handleQuickAddPlan = (title: string, durationMinutes: number, category: Task['category']) => {
    handleSavePlan({
      title,
      durationMinutes,
      category,
      date: getTodayDateString(),
      priority: 'high',
      energyLevel: 'medium',
      preferredSlot: 'any',
    });
  };

  // Immediate Quick-Start Timer without needing plan creation workflow
  const handleQuickStartTimer = (title: string, durationMinutes: number, category: TaskCategory) => {
    const activeTimer = loadActiveTimerFromStorage();
    let targetTask = tasks.find(t => t.title === title && !t.completed);
    if (!targetTask) {
      targetTask = {
        id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        date: getTodayDateString(),
        category,
        durationMinutes,
        priority: 'high',
        energyLevel: 'high',
        completed: false,
        createdAt: Date.now(),
      };
      setTasks(prev => [...prev, targetTask!]);
    }

    if (activeTimer && activeTimer.isRunning && Math.round((activeTimer.targetEndTime - Date.now()) / 1000) > 0) {
      if (activeTimer.taskId === targetTask.id || activeTimer.taskTitle === targetTask.title) {
        setTimerAutoStart(false);
        setFocusTask(targetTask);
        return;
      }
      setActiveSessionPrompt({
        pendingTask: targetTask,
        runningTitle: activeTimer.taskTitle,
      });
      return;
    }

    setTimerAutoStart(true);
    setFocusTask(targetTask);
  };

  // Toggle complete
  const handleToggleComplete = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : undefined } : t))
    );
  }, []);

  // Delete plan
  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setNotificationBannerMsg('Plan removed.');
    setTimeout(() => setNotificationBannerMsg(null), 2500);
  }, []);

  // Cycle task priority inline from timeline
  const handleCyclePriority = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, priority: cycleTaskPriority(t.priority) } : t))
    );
  }, []);

  // Snooze active task by N minutes
  const handleSnoozeTask = useCallback((taskId: string, extraMinutes: number) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            durationMinutes: t.durationMinutes + extraMinutes,
          };
        }
        return t;
      });
      return autoScheduleTasks(updated, config);
    });
  }, [config]);

  // Pin a specific plan to the notifications
  const handlePinAsActive = useCallback((taskId: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === taskId);
      if (!target) return prev;
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, priority: 'urgent' as const };
        }
        return t;
      });
      const scheduled = autoScheduleTasks(updated, config);
      const scheduledTarget = scheduled.find(t => t.id === taskId);
      if (scheduledTarget) {
        pinPlanToNotification(scheduledTarget);
      }
      return scheduled;
    });
    setNotificationBannerMsg('Plan pinned to notification bar.');
    setTimeout(() => setNotificationBannerMsg(null), 3000);
  }, [config]);

  // Update a task's custom category
  const handleUpdateTaskCategory = useCallback((taskId: string, categoryId: string) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, categoryId } : t)));
    setNotificationBannerMsg('Category updated.');
    setTimeout(() => setNotificationBannerMsg(null), 2000);
  }, []);

  // Move task status via Kanban drag-and-drop
  const handleMoveTaskStatus = useCallback((taskId: string, targetStatus: 'active' | 'queued' | 'completed') => {
    setTasks(prev => {
      return prev.map(t => {
        if (t.id !== taskId) return t;
        if (targetStatus === 'completed') {
          return { ...t, completed: true, completedAt: Date.now() };
        } else if (targetStatus === 'active') {
          return { ...t, completed: false, isFixedTime: true };
        } else {
          return { ...t, completed: false };
        }
      });
    });
    if (targetStatus === 'active') {
      handlePinAsActive(taskId);
    }
  }, [handlePinAsActive]);

  // Smart Rebalance Day
  const handleTriggerRebalance = useCallback(() => {
    const now = new Date();
    const currentClock = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setTasks(prev => rebalanceRemainingDay(prev, currentClock, config));
    setNotificationBannerMsg('Daily schedule rebalanced smoothly from current time.');
    setTimeout(() => setNotificationBannerMsg(null), 3500);
  }, [config]);

  // Clear completed plans
  const handleClearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => !t.completed));
    setNotificationBannerMsg('Completed plans cleared.');
    setTimeout(() => setNotificationBannerMsg(null), 2500);
  }, []);

  // Clear all plans
  const handleClearAllPlans = useCallback(() => {
    setTasks([]);
    setNotificationBannerMsg('All plans cleared.');
    setTimeout(() => setNotificationBannerMsg(null), 2500);
  }, []);

  // Restore imported user data
  const handleRestoreData = useCallback((data: any) => {
    if (data.tasks) setTasks(data.tasks);
    if (data.habits) setHabits(data.habits);
    if (data.categories) setCategories(data.categories);
    if (data.config) setConfig(data.config);
    if (data.settings) setSettings(data.settings);
    if (data.focusSessions) setFocusSessions(data.focusSessions);
    if (typeof data.dailyGoalMinutes === 'number') setDailyGoalMinutes(data.dailyGoalMinutes);
    setNotificationBannerMsg('Backup successfully restored.');
    setTimeout(() => setNotificationBannerMsg(null), 3500);
  }, []);

  // Open edit modal for plan
  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setInitialPlanDate(task.date);
    setPlanPrefillData(null);
    setIsPlanFormOpen(true);
  };

  // Open create modal for plan
  const handleOpenCreate = (preselectedDate?: string) => {
    setEditingTask(null);
    setInitialPlanDate(preselectedDate || getTodayDateString());
    setPlanPrefillData(null);
    setIsPlanFormOpen(true);
  };

  // Setup quick action without bypassing required plan configuration
  const handleSetupQuickAction = (
    titleOrPrefill: string | Partial<Task>,
    duration?: number,
    category?: TaskCategory
  ) => {
    let prefill: Partial<Task>;
    if (typeof titleOrPrefill === 'string') {
      prefill = {
        title: titleOrPrefill,
        durationMinutes: duration || 30,
        category: category || 'deep_work',
      };
    } else {
      prefill = titleOrPrefill;
    }
    setEditingTask(null);
    setInitialPlanDate(getTodayDateString());
    setPlanPrefillData(prefill);
    setIsPlanFormOpen(true);
  };

  // Floating mini timer controls
  const handleFloatingPauseResume = () => {
    if (!activeTimerState) return;
    const now = Date.now();
    if (activeTimerState.isRunning) {
      // Pause
      const updated: ActiveTimerState = {
        ...activeTimerState,
        isRunning: false,
        pausedRemainingSeconds: floatingSeconds,
        elapsedSeconds: floatingSeconds,
      };
      saveActiveTimerToStorage(updated);
      setActiveTimerState(updated);
    } else {
      // Resume
      const updated: ActiveTimerState = {
        ...activeTimerState,
        isRunning: true,
        startedAt: now,
        targetEndTime: now + (activeTimerState.pausedRemainingSeconds || 60) * 1000,
      };
      saveActiveTimerToStorage(updated);
      setActiveTimerState(updated);
    }
  };

  const handleFloatingStop = () => {
    saveActiveTimerToStorage(null);
    setActiveTimerState(null);
    setNotificationBannerMsg('Timer stopped.');
    setTimeout(() => setNotificationBannerMsg(null), 2000);
  };

  const handleFloatingExpand = () => {
    if (!activeTimerState) return;
    const matched = tasks.find(t => t.id === activeTimerState.taskId || t.title === activeTimerState.taskTitle);
    if (matched) {
      setTimerAutoStart(false);
      setFocusTask(matched);
    } else {
      setFocusTask({
        id: activeTimerState.taskId,
        title: activeTimerState.taskTitle,
        category: 'deep_work',
        durationMinutes: Math.round((activeTimerState.durationSeconds || 1800) / 60),
        priority: 'high',
        energyLevel: 'high',
        completed: false,
        createdAt: Date.now(),
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Clean Top Navigation Bar */}
      <header className="w-full bg-slate-900/95 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-slate-100 tracking-tight">PlanDroid</span>
                <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t('offline', lang)}
                </span>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2">
            <PWAInstallButton lang={lang} variant="header" />

            {/* Streak Counter Badge */}
            <button
              type="button"
              onClick={() => setMainSection('analytics')}
              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title={`Productivity Streak: ${streakStats.currentStreak} consecutive days (Best: ${streakStats.longestStreak}d)`}
            >
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
              <span className="font-mono text-xs">{streakStats.currentStreak}d</span>
            </button>

            {/* Custom Categories & Tags Button */}
            <button
              type="button"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="p-2 sm:px-2.5 sm:py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Manage Custom Categories & Tags"
            >
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Tags</span>
            </button>

            {/* AI Productivity Coach Button */}
            <button
              type="button"
              onClick={() => setIsAIChatOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Open PlanDroid AI Productivity Coach"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">AI Coach</span>
            </button>

            {tasks.length > 0 && (
              <button
                type="button"
                onClick={handleTriggerRebalance}
                className="p-2 sm:px-3 sm:py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                title="Auto-shift remaining plans forward from current time"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">{t('rebalance', lang)}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('createPlan', lang)}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Transient Notification Feedback Toast */}
      {notificationBannerMsg && (
        <div className="bg-blue-600 text-white text-xs font-medium px-4 py-2 sticky top-15 z-30 shadow-md animate-in fade-in">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{notificationBannerMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotificationBannerMsg(null)}
              className="text-white/80 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Triggered Task Reminder Toast Alerts */}
      {firedReminders.length > 0 && (
        <div className="fixed top-18 right-4 z-50 max-w-sm w-full space-y-2 pointer-events-auto">
          {firedReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="p-3 bg-slate-900 border border-amber-500/80 rounded-2xl shadow-2xl flex items-start gap-2.5 text-xs text-slate-100 animate-in slide-in-from-top-2"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100">{reminder.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const target = tasks.find(t => t.id === reminder.taskId);
                      if (target) {
                        setTimerAutoStart(true);
                        setFocusTask(target);
                      }
                      setFiredReminders(prev => prev.filter(r => r.id !== reminder.id));
                    }}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer"
                  >
                    Start Timer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      snoozeReminder(reminder, 5);
                      setFiredReminders(prev => prev.filter(r => r.id !== reminder.id));
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] transition cursor-pointer"
                  >
                    Snooze 5m
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiredReminders(prev => prev.filter(r => r.id !== reminder.id))}
                    className="px-2 py-1 text-slate-400 hover:text-slate-200 text-[10px] transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 pb-24 space-y-5">
        {/* SECTION 1: TODAY'S PLANS (Timeline & Kanban) */}
        {mainSection === 'plans' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Active Pinned Plan Drawer */}
            <PinnedNotificationDrawer
              tasks={tasks}
              settings={settings}
              onUpdateSettings={setSettings}
              onCompleteTask={handleToggleComplete}
              onSnoozeTask={handleSnoozeTask}
              onOpenFocusModal={(task) => setFocusTask(task)}
            />

            {/* Quick Suggest & NLP Auto-Schedule Bar */}
            {tasks.length > 0 && (
              <TaskSuggestionBar onAddAndScheduleTask={(p) => handleSavePlan(p)} />
            )}

            {/* Sub-view toggle (Timeline vs Kanban) only when plans exist */}
            {tasks.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Today's Schedule ({tasks.filter(t => !t.date || t.date === getTodayDateString()).length} plans)
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setPlansSubView('timeline')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      plansSubView === 'timeline'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Timeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlansSubView('kanban')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                      plansSubView === 'kanban'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Columns3 className="w-3 h-3" />
                    <span>Kanban</span>
                  </button>
                </div>
              </div>
            )}

            {/* Timeline View */}
            {plansSubView === 'timeline' && (
              <TimelineView
                tasks={tasks}
                habits={habits}
                onUpdateHabits={setHabits}
                categories={categories}
                focusSessions={focusSessions}
                dailyGoalMinutes={dailyGoalMinutes}
                onUpdateDailyGoal={setDailyGoalMinutes}
                lang={lang}
                onToggleComplete={handleToggleComplete}
                onDeleteTask={handleDeleteTask}
                onPinAsActive={handlePinAsActive}
                onOpenFocusModal={(task) => {
                  setTimerAutoStart(false);
                  setFocusTask(task);
                }}
                onClearCompleted={handleClearCompleted}
                onCreatePlan={() => handleOpenCreate()}
                onEditPlan={handleOpenEdit}
                onSetupQuickAction={handleSetupQuickAction}
                onReorderTasks={setTasks}
                onCyclePriority={handleCyclePriority}
              />
            )}

            {/* Kanban View */}
            {plansSubView === 'kanban' && tasks.length > 0 && (
              <KanbanView
                tasks={tasks}
                categories={categories}
                onToggleComplete={handleToggleComplete}
                onPinAsActive={handlePinAsActive}
                onDeleteTask={handleDeleteTask}
                onOpenFocusModal={(task) => {
                  setTimerAutoStart(false);
                  setFocusTask(task);
                }}
              />
            )}
          </div>
        )}

        {/* SECTION 2: WEEKLY PLANNER (Monday–Sunday) */}
        {mainSection === 'weekly' && (
          <WeeklyPlannerView
            tasks={tasks}
            config={config}
            lang={lang}
            activeTimerTaskId={focusTask?.id || activeTimerState?.taskId || null}
            onOpenCreate={(preselectedDate) => handleOpenCreate(preselectedDate)}
            onOpenEdit={handleOpenEdit}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
            onDuplicateTask={handleDuplicateTask}
            onStartTimer={(task) => {
              setTimerAutoStart(true);
              setFocusTask(task);
            }}
          />
        )}

        {/* SECTION 3: SMART PRODUCTIVITY & ANALYTICS DASHBOARD */}
        {mainSection === 'analytics' && (
          <AnalyticsView
            tasks={tasks}
            focusSessions={focusSessions}
            config={config}
            dailyGoalMinutes={dailyGoalMinutes}
            lang={lang}
            streakStats={streakStats}
            activeTimerTaskId={focusTask?.id || activeTimerState?.taskId || null}
            onOpenFocusModal={(t) => {
              setTimerAutoStart(true);
              setFocusTask(t || tasks.find(x => !x.completed) || null);
            }}
            onToggleComplete={handleToggleComplete}
            onNavigateToPlans={() => setMainSection('plans')}
            onNavigateToWeekly={() => setMainSection('weekly')}
            onOpenOptimizer={() => setIsOptimizerOpen(true)}
            onTriggerRebalance={handleTriggerRebalance}
          />
        )}

        {/* SECTION 4: PREFERENCES & SETTINGS */}
        {mainSection === 'settings' && (
          <SettingsView
            settings={settings}
            config={config}
            onUpdateSettings={setSettings}
            onUpdateConfig={setConfig}
            onClearAllPlans={handleClearAllPlans}
            onRestoreData={handleRestoreData}
            plansCount={tasks.length}
          />
        )}
      </main>

      {/* Floating Active Mini Timer (shown when timer is running in background and modal is closed) */}
      {activeTimerState && !focusTask && (
        <FloatingActiveTimer
          timerState={activeTimerState}
          secondsDisplay={floatingSeconds}
          onPauseResume={handleFloatingPauseResume}
          onStop={handleFloatingStop}
          onExpand={handleFloatingExpand}
          lang={lang}
        />
      )}

      {/* Fixed Bottom Navigation Bar */}
      <BottomNavBar
        activeSection={mainSection}
        onChangeSection={setMainSection}
        plansCount={tasks.filter(t => !t.completed).length}
        lang={lang}
      />

      {/* Plan Creation / Editing Modal */}
      {isPlanFormOpen && (
        <PlanFormModal
          isOpen={isPlanFormOpen}
          initialTask={editingTask}
          initialDate={initialPlanDate}
          prefillData={planPrefillData}
          existingTasks={tasks}
          categories={categories}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
          defaultDuration={config.defaultTaskDuration || 30}
          onClose={() => {
            setIsPlanFormOpen(false);
            setEditingTask(null);
            setInitialPlanDate(undefined);
            setPlanPrefillData(null);
          }}
          onSave={(planData) => {
            handleSavePlan(planData);
            setPlanPrefillData(null);
          }}
          lang={lang}
        />
      )}

      {/* Custom Categories & Tags Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        tasks={tasks}
        onUpdateCategories={setCategories}
        onUpdateTasks={setTasks}
        lang={lang}
      />

      {/* Focus Timer Modal */}
      {focusTask && (
        <FocusTimerModal
          task={focusTask}
          settings={settings}
          lang={lang}
          autoStart={timerAutoStart}
          onClose={() => {
            setFocusTask(null);
            setTimerAutoStart(false);
          }}
          onCompleteTask={handleToggleComplete}
          onRecordFocusSession={handleRecordFocusSession}
          onUpdateTaskActualTime={handleUpdateTaskActualTime}
          onUpdateSettings={setSettings}
        />
      )}

      {/* Active Session Switch Confirmation Prompt */}
      {activeSessionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">
              {lang === 'am' ? 'የሚሰራ የትኩረት ክፍለ ጊዜ አለ' : 'Session Already In Progress'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {lang === 'am'
                ? `አሁን "${activeSessionPrompt.runningTitle}" እየሄደ ነው። ምን ማድረግ ይፈልጋሉ?`
                : `A focus timer is actively running for "${activeSessionPrompt.runningTitle}". How would you like to proceed?`}
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const running = tasks.find(t => t.title === activeSessionPrompt.runningTitle);
                  setActiveSessionPrompt(null);
                  setTimerAutoStart(false);
                  if (running) {
                    setFocusTask(running);
                  }
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95"
              >
                {lang === 'am' ? 'የነበረውን ክፍለ ጊዜ ቀጥል' : 'Continue Running Session'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const pending = activeSessionPrompt.pendingTask;
                  setActiveSessionPrompt(null);
                  setTimerAutoStart(true);
                  setFocusTask(pending);
                }}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700/60 transition cursor-pointer active:scale-95"
              >
                {lang === 'am' ? 'ወደ አዲሱ ክፍለ ጊዜ ቀይር' : 'Switch to New Session'}
              </button>
              <button
                type="button"
                onClick={() => setActiveSessionPrompt(null)}
                className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                {lang === 'am' ? 'ይቅር / ሰርዝ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Optimizer Modal */}
      <ScheduleOptimizerModal
        config={config}
        isOpen={isOptimizerOpen}
        onClose={() => setIsOptimizerOpen(false)}
        onSaveConfig={setConfig}
        onTriggerRebalance={handleTriggerRebalance}
      />

      {/* Gemini AI Productivity Coach Chat Modal */}
      <GeminiChatModal
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        tasks={tasks}
        streakStats={streakStats}
        lang={lang}
      />
    </div>
  );
}
