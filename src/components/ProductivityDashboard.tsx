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

  const statCard = (title: string, value: string, subtitle: string, Icon: React.FC<{ className?: string }>, colorClass: string) => (
    <div className="rounded-lg border border-border-default bg-surface-panel p-3 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold text-text-muted truncate">{title}</span>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold font-mono text-text-primary">{value}</span>
        <span className="text-[9px] text-text-muted">{subtitle}</span>
      </div>
    </div>
  );

  // Custom accessible Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = data.find((d) => d.displayDate === label);
      return (
        <div className="p-3 rounded-xl border border-border-default bg-surface-panel shadow-xl text-[10px] backdrop-blur-md">
          <p className="font-bold text-text-primary mb-1.5 pb-1 border-b border-border-default">
            {dayData ? dayData.fullDate : label}
          </p>
          <div className="space-y-1">
            <p className="text-blue-400 flex items-center justify-between gap-3">
              <span>{t('legendTasks', lang)}:</span>
              <span className="font-mono font-bold text-text-primary">{payload[0]?.value || 0}</span>
            </p>
            <p className="text-emerald-400 flex items-center justify-between gap-3">
              <span>{t('legendSessions', lang)}:</span>
              <span className="font-mono font-bold text-text-primary">{payload[1]?.value || 0}</span>
            </p>
            {dayData && dayData.focusMinutes > 0 && (
              <p className="text-amber-400 flex items-center justify-between gap-3 pt-1 border-t border-border-default">
                <span>{t('focusedTimeStat', lang)}:</span>
                <span className="font-mono font-bold text-text-primary">{formatHoursMinutes(dayData.focusMinutes)}</span>
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
      className="w-full page-section space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-default">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              {t('productivityStats', lang)}
            </h3>
            <p className="text-[10px] text-text-muted">{t('productivitySubtitle', lang)}</p>
          </div>
        </div>

        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
          {t('sevenDayOverview', lang)}
        </span>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCard(
          t('completedTasksStat', lang),
          String(totalCompletedTasks),
          t('tasksUnit', lang),
          CheckCircle2,
          'text-blue-400'
        )}
        {statCard(
          t('completedSessionsStat', lang),
          String(totalCompletedSessions),
          t('sessionsUnit', lang),
          Timer,
          'text-emerald-400'
        )}
        {statCard(
          t('focusedTimeStat', lang),
          formatHoursMinutes(totalFocusMinutes),
          '',
          Clock,
          'text-indigo-400'
        )}
        {statCard(
          t('dailyAverageStat', lang),
          dailyAverageTasks,
          `${t('tasksUnit', lang)}/day`,
          TrendingUp,
          'text-amber-400'
        )}
      </div>

      {/* Recharts Interactive Chart */}
      <div className="rounded-xl border border-border-default bg-surface-elevated p-4">
        <div className="flex items-center justify-between text-[9px] mb-3 text-text-muted">
          <span className="font-semibold text-text-primary">{t('activityComparison', lang)}</span>
          <span className="text-text-muted">{t('daysWithoutActivity', lang)}</span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
              <XAxis
                dataKey="displayDate"
                stroke="currentColor"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'currentColor' }}
              />
              <YAxis
                allowDecimals={false}
                stroke="currentColor"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'currentColor' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                iconType="circle"
              />
              <Bar
                dataKey="completedTasks"
                name={t('legendTasks', lang)}
                fill="#60a5fa"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="completedSessions"
                name={t('legendSessions', lang)}
                fill="#34d399"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!hasActivity && (
          <div className="mt-3 text-center text-[10px] text-text-muted bg-surface-elevated p-2.5 rounded-lg border border-border-default flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>{t('noActivityRecorded', lang)}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductivityDashboard;
