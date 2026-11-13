import React from 'react';
import type { Task, FocusSession, Language } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Timer,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { t } from '../utils/i18n';
import { formatHoursMinutes } from '../utils/scheduler';

export interface ProductivityDashboardProps {
  tasks: Task[];
  focusSessions: FocusSession[];
  lang: Language;
}

export interface DayMetric {
  dateKey: string;
  displayDate: string;
  fullDate: string;
  completedTasks: number;
  completedSessions: number;
  focusMinutes: number;
}

/**
 * Computes 7-day productivity metrics ending today in the user's local timezone.
 */
export function computeSevenDayMetrics(tasks: Task[], focusSessions: FocusSession[]): DayMetric[] {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeSessions = Array.isArray(focusSessions) ? focusSessions : [];

  const metrics: DayMetric[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const targetDateStr = targetDate.toDateString();
    const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const monthName = targetDate.toLocaleDateString(undefined, { month: 'short' });
    const weekday = targetDate.toLocaleDateString(undefined, { weekday: 'short' });
    const dayNum = targetDate.getDate();

    // Match completed tasks on this date
    const completedTasksCount = safeTasks.filter((t) => {
      if (!t || !t.completed) return false;
      if (t.completedAt) {
        return new Date(t.completedAt).toDateString() === targetDateStr;
      }
      // If completedAt wasn't saved, assume today if i === 0, or createdAt date
      if (i === 0) return true;
      return t.createdAt && new Date(t.createdAt).toDateString() === targetDateStr;
    }).length;

    // Match focus sessions on this date
    const daySessions = safeSessions.filter((s) => {
      return s && s.completedAt && new Date(s.completedAt).toDateString() === targetDateStr;
    });

    const dayFocusMinutes = daySessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);

    metrics.push({
      dateKey,
      displayDate: `${weekday} ${dayNum}`,
      fullDate: `${monthName} ${dayNum}, ${targetDate.getFullYear()}`,
      completedTasks: completedTasksCount,
      completedSessions: daySessions.length,
      focusMinutes: dayFocusMinutes,
    });
  }

  return metrics;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  tasks,
  focusSessions,
  lang,
}) => {
  const data = computeSevenDayMetrics(tasks, focusSessions);

  // Summary aggregates
  const totalCompletedTasks = data.reduce((acc, d) => acc + d.completedTasks, 0);
  const totalCompletedSessions = data.reduce((acc, d) => acc + d.completedSessions, 0);
  const totalFocusMinutes = data.reduce((acc, d) => acc + d.focusMinutes, 0);
  const dailyAverageTasks = (totalCompletedTasks / 7).toFixed(1);

  const hasActivity = totalCompletedTasks > 0 || totalCompletedSessions > 0 || totalFocusMinutes > 0;

  // Custom accessible Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = data.find((d) => d.displayDate === label);
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs backdrop-blur-md">
          <p className="font-bold text-slate-200 mb-1.5 pb-1 border-b border-slate-800">
            {dayData ? dayData.fullDate : label}
          </p>
          <div className="space-y-1">
            <p className="text-blue-400 flex items-center justify-between gap-3">
              <span>{t('legendTasks', lang)}:</span>
              <span className="font-mono font-bold text-slate-100">{payload[0]?.value || 0}</span>
            </p>
            <p className="text-emerald-400 flex items-center justify-between gap-3">
              <span>{t('legendSessions', lang)}:</span>
              <span className="font-mono font-bold text-slate-100">{payload[1]?.value || 0}</span>
            </p>
            {dayData && dayData.focusMinutes > 0 && (
              <p className="text-amber-400 flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
                <span>{t('focusedTimeStat', lang)}:</span>
                <span className="font-mono font-bold text-slate-100">{formatHoursMinutes(dayData.focusMinutes)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section 
      aria-label="Productivity Stats Dashboard"
      className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {t('productivityStats', lang)}
            </h3>
            <p className="text-xs text-slate-400">
              {t('productivitySubtitle', lang)}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 px-2.5 py-1 rounded-full self-start sm:self-auto">
          {t('sevenDayOverview', lang)}
        </span>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Completed Tasks */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="truncate">{t('completedTasksStat', lang)}</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-blue-400">{totalCompletedTasks}</span>
            <span className="text-[11px] text-slate-500">{t('tasksUnit', lang)}</span>
          </div>
        </div>

        {/* Card 2: Completed Focus Sessions */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="truncate">{t('completedSessionsStat', lang)}</span>
            <Timer className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-emerald-400">{totalCompletedSessions}</span>
            <span className="text-[11px] text-slate-500">{t('sessionsUnit', lang)}</span>
          </div>
        </div>

        {/* Card 3: Total Focused Time */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="truncate">{t('focusedTimeStat', lang)}</span>
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-indigo-400">{formatHoursMinutes(totalFocusMinutes)}</span>
          </div>
        </div>

        {/* Card 4: Daily Average Completion */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
            <span className="truncate">{t('dailyAverageStat', lang)}</span>
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-amber-400">{dailyAverageTasks}</span>
            <span className="text-[11px] text-slate-500">{t('tasksUnit', lang)}/day</span>
          </div>
        </div>
      </div>

      {/* Recharts Interactive Chart */}
      <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4">
        <div className="flex items-center justify-between text-xs mb-3 text-slate-400">
          <span className="font-semibold text-slate-200">
            {t('activityComparison', lang)}
          </span>
          <span className="text-[10px] text-slate-500">
            {t('daysWithoutActivity', lang)}
          </span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-700)" opacity={0.4} />
              <XAxis
                dataKey="displayDate"
                stroke="var(--color-slate-400)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-slate-600)' }}
              />
              <YAxis
                allowDecimals={false}
                stroke="var(--color-slate-400)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-slate-600)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar
                dataKey="completedTasks"
                name={t('legendTasks', lang)}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="completedSessions"
                name={t('legendSessions', lang)}
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!hasActivity && (
          <div className="mt-2 text-center text-xs text-slate-500 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('noActivityRecorded', lang)}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductivityDashboard;
