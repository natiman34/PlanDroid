import React, { useState, useRef } from 'react';
import type { NotificationSettings, WorkScheduleConfig, Language, AlarmSound } from '../types';
import {
  Settings,
  Bell,
  Volume2,
  VolumeX,
  Clock,
  Trash2,
  Download,
  Upload,
  ShieldCheck,
  Check,
  Languages,
  Smartphone,
  Play,
  Moon,
  Sun,
  Monitor,
  Radio,
  Sliders,
  Calendar,
  Sparkles,
  AlertCircle,
  Vibrate,
  Copy,
} from 'lucide-react';
import { playAlarmSound, playOneMinuteWarning } from '../utils/audio';
import { requestNotificationPermission, getNotificationStatus } from '../utils/notifications';
import { exportAllUserData, importUserData } from '../utils/storage';
import { t } from '../utils/i18n';

interface SettingsViewProps {
  settings: NotificationSettings;
  config: WorkScheduleConfig;
  onUpdateSettings: (settings: NotificationSettings) => void;
  onUpdateConfig: (config: WorkScheduleConfig) => void;
  onClearAllPlans: () => void;
  onRestoreData?: (data: any) => void;
  plansCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  config,
  onUpdateSettings,
  onUpdateConfig,
  onClearAllPlans,
  onRestoreData,
  plansCount,
}) => {
  const lang = settings.language || 'en';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedStatus, setCopiedStatus] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notificationState, setNotificationState] = useState(getNotificationStatus());
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isPlayingWarningTest, setIsPlayingWarningTest] = useState(false);
  const [isTestingVibration, setIsTestingVibration] = useState(false);

  const handleLanguageChange = (newLang: Language) => {
    onUpdateSettings({ ...settings, language: newLang });
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setNotificationState(getNotificationStatus());
    onUpdateSettings({
      ...settings,
      permissionStatus: result,
      showInNativeSystem: result === 'granted',
    });
  };

  const handleTestAlarm = () => {
    setIsPlayingTest(true);
    playAlarmSound(settings.timerAlarmSound, settings.alarmVolume);
    setTimeout(() => setIsPlayingTest(false), 1200);
  };

  const handleTestWarning = () => {
    setIsPlayingWarningTest(true);
    playOneMinuteWarning(settings.alarmVolume);
    setTimeout(() => setIsPlayingWarningTest(false), 800);
  };

  const handleTestVibration = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      setIsTestingVibration(true);
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {
        console.warn('Vibration not permitted or failed', e);
      }
      setTimeout(() => setIsTestingVibration(false), 600);
    }
  };

  // Export full JSON backup
  const handleExportFullBackup = () => {
    const backupPayload = exportAllUserData();
    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plandroid-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  // Import JSON backup from user file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = importUserData(content);
        if (res.success && res.data) {
          setImportStatusMsg({ type: 'success', text: t('restoreSuccess', lang) });
          if (onRestoreData) {
            onRestoreData(res.data);
          }
        } else {
          setImportStatusMsg({ type: 'error', text: res.message || t('restoreError', lang) });
        }
      } catch (err: any) {
        setImportStatusMsg({ type: 'error', text: err?.message || t('restoreError', lang) });
      }
      setTimeout(() => setImportStatusMsg(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sectionHeader = (icon: React.FC<{ className?: string }>, label: string, subtitle?: string) => {
    const Icon = icon;
    return (
      <div className="sectionheader">
        <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center text-blue-400 border border-border-default shrink-0">
          <Icon className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="sectiontitle">{label}</h3>
          {subtitle && <p className="text-[10px] text-text-muted">{subtitle}</p>}
        </div>
      </div>
    );
  };

  const optionButton = (
    label: string,
    onClick: () => void,
    isSelected: boolean,
    variant: 'primary' | 'success' | 'amber' | 'blue' | 'indigo' | 'emerald' | 'gray' = 'gray',
  ) => {
    const base = 'flex-1 py-2.5 rounded-lg text-xs font-semibold border transition cursor-pointer text-center flex flex-col items-center gap-0.5';
    const activeClasses = {
      primary: 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm shadow-blue-500/20',
      success: 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/20',
      amber: 'bg-amber-600 border-amber-500 text-white font-bold shadow-sm shadow-amber-500/20',
      blue: 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm shadow-blue-500/20',
      indigo: 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-sm shadow-indigo-500/20',
      emerald: 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-sm shadow-emerald-500/20',
      gray: 'bg-surface-base border-border-default text-text-muted hover:text-text-primary hover:border-border-focused',
    };
    return (
      <button type="button" onClick={onClick} className={`${base} ${activeClasses[variant]}`}>
        {label}
      </button>
    );
  };

  return (
    <div className="w-full space-y-5 pageenter pageenteractive">
      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="card panel">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">{t('settingsTitle', lang)}</h2>
            <p className="text-[10px] text-text-muted">{t('settingsSubtitle', lang)}</p>
          </div>
        </div>
      </div>

      {/* Notification status banner if import happened */}
      {importStatusMsg && (
        <div
          className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-semibold animatefadein ${
            importStatusMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
          }`}
        >
          {importStatusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{importStatusMsg.text}</span>
        </div>
      )}

      {/* SECTION 1: PLANNING & PRODUCTIVITY PREFERENCES */}
      <div className="page-section space-y-4">
        {sectionHeader(Sliders, t('weeklyPlanningPrefs', lang), t('preferencesDesc', lang))}

        {/* App Theme (Dark / Light / System) */}
        <div className="space-y-2">
          <label className="fieldlabel flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('themeSection', lang)}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark', desc: t('darkDesc', lang), icon: Moon },
              { id: 'light', label: 'Light', desc: t('lightDesc', lang), icon: Sun },
              { id: 'system', label: 'System', desc: t('systemDesc', lang), icon: Monitor },
            ].map((th) => {
              const Icon = th.icon;
              const isSelected = (settings.theme || 'dark') === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, theme: th.id as any })}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm shadow-blue-500/20'
                      : 'btnghost'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{th.label}</span>
                  <span className="text-[9px] opacity-80">{th.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Format & Week Start Day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Time Format */}
          <div className="space-y-2">
            <label className="fieldlabel">{t('timeFormat', lang)}</label>
            <div className="grid grid-cols-2 gap-2">
              {optionButton(
                '24h',
                () => onUpdateConfig({ ...config, timeFormat: '24h' }),
                (config.timeFormat || '24h') === '24h',
                'primary',
              )}
              {optionButton(
                '12h',
                () => onUpdateConfig({ ...config, timeFormat: '12h' }),
                config.timeFormat === '12h',
                'blue',
              )}
            </div>
          </div>

          {/* Week Start Day */}
          <div className="space-y-2">
            <label className="fieldlabel">{t('weekStartDay', lang)}</label>
            <div className="grid grid-cols-2 gap-2">
              {optionButton(
                'Mon',
                () => onUpdateConfig({ ...config, weekStartsOn: 1 }),
                (config.weekStartsOn ?? 1) === 1,
                'primary',
              )}
              {optionButton(
                'Sun',
                () => onUpdateConfig({ ...config, weekStartsOn: 0 }),
                config.weekStartsOn === 0,
                'blue',
              )}
            </div>
          </div>
        </div>

        {/* Default Task Duration & Reminder Interval */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-default">
          <div>
            <label className="fieldlabel">{t('defaultTaskDuration', lang)}</label>
            <div className="flex gap-1.5">
              {[15, 25, 30, 45, 60].map((mins) => (
                optionButton(
                  `${mins}m`,
                  () => onUpdateConfig({ ...config, defaultTaskDuration: mins }),
                  (config.defaultTaskDuration || 30) === mins,
                  'primary',
                )
              ))}
            </div>
          </div>

          <div>
            <label className="fieldlabel">{t('defaultReminderInterval', lang)}</label>
            <div className="flex gap-1.5">
              {[
                { val: 0, label: '0m' },
                { val: 5, label: '5m' },
                { val: 10, label: '10m' },
                { val: 15, label: '15m' },
              ].map((item) => (
                optionButton(
                  item.label,
                  () => onUpdateConfig({ ...config, defaultReminderMinutes: item.val }),
                  (config.defaultReminderMinutes ?? 10) === item.val,
                  'blue',
                )
              ))}
            </div>
          </div>
        </div>

        {/* Focus & Break Durations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-default">
          <div>
            <label className="fieldlabel">{t('defaultFocusDuration', lang)}</label>
            <div className="flex gap-1.5">
              {[20, 25, 30, 45, 50].map((mins) => (
                optionButton(
                  `${mins}m`,
                  () => onUpdateConfig({ ...config, defaultFocusDuration: mins }),
                  (config.defaultFocusDuration || 25) === mins,
                  'indigo',
                )
              ))}
            </div>
          </div>

          <div>
            <label className="fieldlabel">{t('defaultBreakDuration', lang)}</label>
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map((mins) => (
                optionButton(
                  `${mins}m`,
                  () => onUpdateConfig({ ...config, defaultBreakDuration: mins }),
                  (config.defaultBreakDuration || 5) === mins,
                  'emerald',
                )
              ))}
            </div>
          </div>
        </div>

        {/* Daily & Weekly Productivity Target Goals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border-default">
          <div>
            <label className="fieldlabel flex items-center gap-1">
              <span>{t('dailyFocusTarget', lang)}</span>
              <span className="text-[10px] text-text-muted font-normal">({t('hours', lang)})</span>
            </label>
            <input
              type="number"
              min={1}
              max={16}
              step={0.5}
              value={Math.round(((config.dailyGoalMinutes || 240) / 60) * 10) / 10}
              onChange={(e) => onUpdateConfig({ ...config, dailyGoalMinutes: Math.round(Math.max(1, Number(e.target.value)) * 60) })}
              className="fieldinput text-xs font-mono"
            />
          </div>

          <div>
            <label className="fieldlabel flex items-center gap-1">
              <span>{t('weeklyFocusTarget', lang)}</span>
              <span className="text-[10px] text-text-muted font-normal">({t('hours', lang)})</span>
            </label>
            <input
              type="number"
              min={5}
              max={80}
              step={1}
              value={Math.round(((config.weeklyGoalMinutes || 1200) / 60) * 10) / 10}
              onChange={(e) => onUpdateConfig({ ...config, weeklyGoalMinutes: Math.round(Math.max(5, Number(e.target.value)) * 60) })}
              className="fieldinput text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: LANGUAGE SELECTOR */}
      <div className="page-section space-y-3">
        {sectionHeader(Languages, t('languageSection', lang), t('selectLanguage', lang))}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`flex items-center justify-between p-3 rounded-lg text-left border transition cursor-pointer ${
              lang === 'en'
                ? 'btnprimary'
                : 'btnghost'
            }`}
          >
            <div>
              <span className="text-xs font-bold block">English</span>
              <span className="text-[10px] text-text-muted">Default interface</span>
            </div>
            {lang === 'en' && <Check className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('am')}
            className={`flex items-center justify-between p-3 rounded-lg text-left border transition cursor-pointer ${
              lang === 'am'
                ? 'btnprimary'
                : 'btnghost'
            }`}
          >
            <div>
              <span className="text-xs font-bold block">አማርኛ (Amharic)</span>
              <span className="text-[10px] text-text-muted">{t('amharicDesc', lang)}</span>
            </div>
            {lang === 'am' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SECTION 3: ALARM & SOUND OPTIONS */}
      <div className="page-section space-y-4">
        {sectionHeader(Volume2, t('alarmSoundSection', lang), t('alarmSoundDesc', lang))}

        {/* Master Alarm Toggle */}
        <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg bg-surface-elevated border border-border-default">
          <div>
            <span className="text-xs font-semibold text-text-primary block">{t('timerAlarmToggle', lang)}</span>
            <span className="text-[10px] text-text-muted">{t('timerAlarmToggleDesc', lang)}</span>
          </div>
          <input
            type="checkbox"
            checked={settings.timerAlarmEnabled}
            onChange={(e) => onUpdateSettings({ ...settings, timerAlarmEnabled: e.target.checked })}
            className="toggleswitch peer"
          />
        </label>

        {settings.timerAlarmEnabled && (
          <div className="space-y-3 pt-1">
            {/* Alarm Sound Melody Selector */}
            <div>
              <label className="fieldlabel">{t('alarmSoundLabel', lang)}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'bell', label: t('alarmSoundBell', lang) },
                  { id: 'digital', label: t('alarmSoundDigital', lang) },
                  { id: 'chime', label: t('alarmSoundChime', lang) },
                  { id: 'harp', label: t('alarmSoundHarp', lang) },
                ].map((sound) => (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => {
                      playAlarmSound(sound.id as AlarmSound, settings.alarmVolume);
                      onUpdateSettings({ ...settings, timerAlarmSound: sound.id as AlarmSound });
                    }}
                    className={`py-2.5 px-3 rounded-lg text-xs font-medium text-left transition cursor-pointer border ${
                      settings.timerAlarmSound === sound.id
                        ? 'btnsuccess'
                        : 'btnghost text-text-muted hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs block font-semibold">{sound.label}</span>
                      {settings.timerAlarmSound === sound.id && (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Slider */}
            <div className="bg-surface-elevated/50 rounded-lg border border-border-default p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span className="font-semibold flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  {t('alarmVolumeLabel', lang)}
                </span>
                <span className="font-mono text-blue-400 font-extrabold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {Math.round((settings.alarmVolume ?? 0.8) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={settings.alarmVolume ?? 0.8}
                onChange={(e) => onUpdateSettings({ ...settings, alarmVolume: Number(e.target.value) })}
                className="w-full h-1.5 bg-surface-hover rounded-lg cursor-pointer accent-blue-500"
              />
              {/* Volume Preset Chips */}
              <div className="flex items-center justify-between gap-1.5 pt-1 text-[10px]">
                {[0.25, 0.5, 0.8, 1.0].map((vol) => (
                  optionButton(
                    `${Math.round(vol * 100)}%`,
                    () => {
                      onUpdateSettings({ ...settings, alarmVolume: vol });
                      playAlarmSound(settings.timerAlarmSound, vol);
                    },
                    Math.abs((settings.alarmVolume ?? 0.8) - vol) < 0.04,
                    'blue',
                  )
                ))}
              </div>
            </div>

            {/* Alarm Repeat Interval */}
            <div>
              <label className="fieldlabel">{t('alarmRepeatIntervalLabel', lang)}</label>
              <p className="text-[10px] text-text-muted mb-2">
                {lang === 'am'
                  ? t('alarmRepeatIntervalDescAm', lang)
                  : t('alarmRepeatIntervalDescEn', lang)}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: 0, label: t('repeatSustained', lang), isSustained: true },
                  { value: 15, label: 'Every 15s' },
                  { value: 30, label: t('repeat30s', lang) },
                  { value: 60, label: t('every1Min', lang) },
                  { value: 120, label: t('every2Min', lang) },
                  { value: -1, label: t('playOnceNoRepeat', lang) },
                ].map((opt) => {
                  const isSelected = (settings.alarmRepeatIntervalSeconds ?? 0) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, alarmRepeatIntervalSeconds: opt.value })}
                      className={`p-2 rounded-lg text-xs font-medium text-left border transition cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'btnsuccess text-white'
                          : 'btnghost text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate text-[10px]">{opt.label}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                      </div>
                      {opt.isSustained && (
                        <span className="text-[9px] text-blue-300 font-mono font-bold mt-0.5">Sustained</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1-Minute Warning Chime */}
            <div className="p-3 rounded-lg border border-border-default bg-surface-elevated/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <span className="text-xs font-semibold text-text-primary block flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-400" />
                  {t('oneMinuteWarningToggle', lang)}
                </span>
                <span className="text-[10px] text-text-muted mt-0.5 block leading-relaxed">
                  {t('oneMinuteWarningDesc', lang)}
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleTestWarning}
                  className="px-2 py-1 rounded-lg bg-surface-hover border border-border-default text-text-secondary text-[10px] font-medium transition cursor-pointer flex items-center gap-1 active:scale-[0.97]"
                  title={t('testWarning', lang)}
                >
                  <Play className={`w-3 h-3 ${isPlayingWarningTest ? 'animate-spin' : ''}`} />
                  <span>{t('testSound', lang)}</span>
                </button>
                <input
                  type="checkbox"
                  checked={settings.oneMinuteWarningEnabled !== false}
                  onChange={(e) => onUpdateSettings({ ...settings, oneMinuteWarningEnabled: e.target.checked })}
                  className="toggleswitch peer"
                />
              </div>
            </div>

            {/* Vibration Alerts */}
            <div className="p-3 rounded-lg border border-border-default bg-surface-elevated/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <span className="text-xs font-semibold text-text-primary block flex items-center gap-1.5">
                  <Vibrate className="w-3.5 h-3.5 text-blue-400" />
                  {t('vibrationLabel', lang)}
                </span>
                <span className="text-[10px] text-text-muted mt-0.5 block leading-relaxed">
                  {t('vibrationDesc', lang)}
                </span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {typeof window !== 'undefined' && 'vibrate' in navigator && (
                  <button
                    type="button"
                    onClick={handleTestVibration}
                    className="px-2 py-1 rounded-lg bg-surface-hover border border-border-default text-text-secondary text-[10px] font-medium transition cursor-pointer flex items-center gap-1 active:scale-[0.97]"
                    title={t('testVibration', lang)}
                  >
                    <Vibrate className={`w-3 h-3 ${isTestingVibration ? 'animate-bounce' : ''}`} />
                    <span>{t('testPulse', lang)}</span>
                  </button>
                )}
                <input
                  type="checkbox"
                  checked={settings.vibrateEnabled !== false}
                  onChange={(e) => onUpdateSettings({ ...settings, vibrateEnabled: e.target.checked })}
                  className="toggleswitch peer"
                />
              </div>
            </div>

            {/* Task Completion Sound */}
            <label className="flex items-center justify-between cursor-pointer p-3 border-t border-border-default">
              <div>
                <span className="text-xs font-semibold text-text-primary block">{t('taskCompletionSoundLabel', lang)}</span>
                <span className="text-[10px] text-text-muted">{t('taskCompletionSoundDesc', lang)}</span>
              </div>
              <input
                type="checkbox"
                checked={settings.taskCompletionSound}
                onChange={(e) => onUpdateSettings({ ...settings, taskCompletionSound: e.target.checked })}
                className="toggleswitch peer"
              />
            </label>
          </div>
        )}
      </div>

      {/* SECTION 4: MOBILE & BROWSER NOTIFICATIONS */}
      <div className="page-section space-y-4">
        {sectionHeader(Bell, t('notificationSection', lang), t('notificationSectionDesc', lang))}

        <div className="flex items-center justify-between pb-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{t('permissionStatus', lang)}</span>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
            notificationState.permission === 'granted'
              ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/40'
              : notificationState.permission === 'denied'
              ? 'bg-rose-950/20 text-rose-400 border-rose-500/40'
              : 'bg-surface-elevated text-text-muted border-border-default'
          }`}>
            {notificationState.permission}
          </span>
        </div>

        <p className="text-[10px] text-text-muted leading-relaxed">{t('notificationSectionDescDetail', lang)}</p>

        {notificationState.permission !== 'granted' ? (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="w-full py-2.5 px-4 btnprimary text-sm inline-flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>{t('enableNotifications', lang)}</span>
          </button>
        ) : (
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t('notificationsGranted', lang)}</span>
          </div>
        )}

        {/* Persistent Task Reminders with Quiet Hours */}
        <div className="pt-2 border-t border-border-default space-y-3">
          <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-surface-hover transition cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-text-primary block">{t('persistentRemindersToggle', lang)}</span>
              <span className="text-[10px] text-text-muted">{t('persistentRemindersDesc', lang)}</span>
            </div>
            <input
              type="checkbox"
              checked={settings.persistentReminders}
              onChange={(e) => onUpdateSettings({ ...settings, persistentReminders: e.target.checked })}
              className="toggleswitch peer"
            />
          </label>

          {settings.persistentReminders && (
            <div className="p-3 rounded-lg border border-border-default bg-surface-elevated/50 space-y-3">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">{t('reminderIntervalLabel', lang)}</label>
                <div className="flex gap-2">
                  {[15, 30, 60].map((mins) => (
                    optionButton(
                      `${mins}m`,
                      () => onUpdateSettings({ ...settings, reminderIntervalMinutes: mins }),
                      settings.reminderIntervalMinutes === mins,
                      'blue',
                    )
                  ))}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="pt-2 border-t border-border-default">
                <label className="flex items-center justify-between cursor-pointer mb-2 p-1 rounded-lg hover:bg-surface-hover transition cursor-pointer">
                  <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    {t('quietHoursLabel', lang)}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.quietHoursEnabled}
                    onChange={(e) => onUpdateSettings({ ...settings, quietHoursEnabled: e.target.checked })}
                    className="toggleswitch peer"
                  />
                </label>

                {settings.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-[9px] text-text-muted block mb-1">{t('quietFrom', lang)}</span>
                      <input
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => onUpdateSettings({ ...settings, quietHoursStart: e.target.value })}
                        className="w-full fieldinput text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-text-muted block mb-1">{t('quietUntil', lang)}</span>
                      <input
                        type="time"
                        value={settings.quietHoursEnd}
                        onChange={(e) => onUpdateSettings({ ...settings, quietHoursEnd: e.target.value })}
                        className="w-full fieldinput text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: WORKDAY PREFERENCES */}
      <div className="page-section space-y-4">
        {sectionHeader(Clock, t('workdayPreferences', lang), t('workdayPrefsDesc', lang))}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="fieldlabel">{t('workdayStarts', lang)}</label>
            <input
              type="time"
              value={config.workStart}
              onChange={(e) => onUpdateConfig({ ...config, workStart: e.target.value })}
              className="fieldinput text-xs font-mono"
            />
          </div>

          <div>
            <label className="fieldlabel">{t('workdayEnds', lang)}</label>
            <input
              type="time"
              value={config.workEnd}
              onChange={(e) => onUpdateConfig({ ...config, workEnd: e.target.value })}
              className="fieldinput text-xs font-mono"
            />
          </div>

          <div>
            <label className="fieldlabel">{t('lunchBreakStart', lang)}</label>
            <input
              type="time"
              value={config.lunchStart}
              onChange={(e) => onUpdateConfig({ ...config, lunchStart: e.target.value })}
              className="fieldinput text-xs font-mono"
            />
          </div>

          <div>
            <label className="fieldlabel">{t('lunchDurationMinutes', lang)}</label>
            <input
              type="number"
              min={15}
              max={120}
              step={5}
              value={config.lunchDuration}
              onChange={(e) => onUpdateConfig({ ...config, lunchDuration: Math.max(15, Number(e.target.value)) })}
              className="fieldinput text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 6: DATA BACKUP, RESTORE & SYSTEM RESET */}
      <div className="page-section space-y-4">
        {sectionHeader(ShieldCheck, t('backupAndRestore', lang), t('personalPlanDataDesc', lang))}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Export Full JSON Backup */}
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="py-2.5 px-3 btnsecondary text-[10px] inline-flex items-center justify-center gap-2"
          >
            {copiedStatus ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3 text-blue-400" />}
            <span>{copiedStatus ? t('exported', lang) : t('exportFullBackup', lang)}</span>
          </button>

          {/* Import JSON Backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 btnsecondary text-[10px] inline-flex items-center justify-center gap-2"
          >
            <Upload className="w-3 h-3 text-emerald-400" />
            <span>{t('importBackup', lang)}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-border-default">
          <a
            href="/plandroid-source.zip"
            download="plandroid-source.zip"
            className="flex-1 py-2 px-3 btnghost text-[10px] inline-flex items-center justify-center gap-2 border border-border-default text-text-muted hover:text-text-primary hover:bg-surface-hover"
            title="Download full project source code as a ZIP archive"
          >
            <Download className="w-3 h-3 text-blue-400" />
            <span>{t('downloadSourceZip', lang)}</span>
          </a>

          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            className="py-2 px-4 btnoutline text-[10px] inline-flex items-center justify-center gap-2 border-rose-500/40 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300"
          >
            <Trash2 className="w-3 h-3" />
            <span>{t('clearAllPlans', lang)} ({plansCount})</span>
          </button>
        </div>

        {/* Clear Confirmation Modal */}
        {isConfirmClearOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animatefadein duration-200">
            <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-panel p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <h3 className="text-sm font-bold text-text-primary">{t('confirmClearTitle', lang)}</h3>
              </div>
              <p className="text-[10px] text-text-secondary leading-relaxed mb-4">{t('confirmClearDesc', lang)}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllPlans();
                    setIsConfirmClearOpen(false);
                  }}
                  className="flex-1 py-2 px-3 btndanger text-xs font-bold"
                >
                  {t('yesClearAll', lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmClearOpen(false)}
                  className="px-2 py-1 btnghost text-xs font-medium"
                >
                  {t('cancel', lang)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
