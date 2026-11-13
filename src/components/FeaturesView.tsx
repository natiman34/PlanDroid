import React from 'react';
import type { Task, WorkScheduleConfig, FocusSession, Language } from '../types';
import {
  Timer,
  RefreshCw,
  Sliders,
  BarChart3,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { t } from '../utils/i18n';
import { ProductivityDashboard } from './ProductivityDashboard';

interface FeaturesViewProps {
  tasks: Task[];
  focusSessions: FocusSession[];
  config: WorkScheduleConfig;
  lang: Language;
  onOpenFocusModal: (task?: Task) => void;
  onOpenOptimizer: () => void;
  onTriggerRebalance: () => void;
  onNavigateToPlans: () => void;
}

export const FeaturesView: React.FC<FeaturesViewProps> = ({
  tasks,
  focusSessions,
  config,
  lang,
  onOpenFocusModal,
  onOpenOptimizer,
  onTriggerRebalance,
  onNavigateToPlans,
}) => {
  const activeTask = tasks.find(t => !t.completed && t.startTime);
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {t('featuresTitle', lang)}
            </h2>
            <p className="text-xs text-slate-400">
              {t('featuresSubtitle', lang)}
            </p>
          </div>
        </div>
      </div>

      {/* Feature 1: Productivity Stats Recharts Dashboard */}
      <ProductivityDashboard
        tasks={tasks}
        focusSessions={focusSessions}
        lang={lang}
      />

      {/* Feature Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Deep Focus Pomodoro Timer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-3">
              <Timer className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              {t('deepFocusTimer', lang)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t('deepFocusDesc', lang)}
            </p>
            {activeTask && (
              <div className="mt-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  {t('activePlan', lang)}:
                </span>
                <span className="font-semibold text-slate-200 truncate block">{activeTask.title}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              onOpenFocusModal(activeTask || undefined);
            }}
            className="mt-4 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Timer className="w-4 h-4" />
            <span>{t('launchTimer', lang)}</span>
          </button>
        </div>

        {/* Smart Schedule Rebalancer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              {t('rebalance', lang)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Shift all remaining unfinished plans smoothly forward from the current clock time.
            </p>
            <div className="mt-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>{t('workdayPreferences', lang)}:</span>
              <span className="font-mono text-slate-200 font-semibold">{config.workStart} - {config.workEnd}</span>
            </div>
          </div>

          <button
            onClick={() => {
              onTriggerRebalance();
            }}
            className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('rebalance', lang)}</span>
          </button>
        </div>

        {/* Workday Schedule Optimizer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              {t('workdayPreferences', lang)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Configure daily working hours, protected lunch recharge break, and cognitive rest buffers between tasks.
            </p>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t('lunchBreakStart', lang)}:</span>
                <span className="font-mono text-slate-200">{config.lunchStart} ({config.lunchDuration}m)</span>
              </div>
              <div className="flex justify-between">
                <span>{t('bufferMinutesLabel', lang)}:</span>
                <span className="font-mono text-slate-200">{config.bufferMinutes}m</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onOpenOptimizer();
            }}
            className="mt-4 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>{t('workdayPreferences', lang)}</span>
          </button>
        </div>

        {/* Plan Management Quick Link */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              {t('plans', lang)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Quickly jump back to personal plans to organize, pin, complete, or edit your schedule.
            </p>
            <div className="mt-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">{t('taskCompletionStatus', lang)}:</span>
              <span className="font-mono font-bold text-emerald-400">{completedCount} {t('of', lang)} {totalCount} ({percentComplete}%)</span>
            </div>
          </div>

          <button
            onClick={() => {
              onNavigateToPlans();
            }}
            className="mt-4 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <span>{t('plans', lang)}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturesView;
