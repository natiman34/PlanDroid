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
} from 'lucide-react';
import { playAlarmSound, playOneMinuteWarning } from '../utils/audio';
import { requestNotificationPermission, getNotificationStatus } from '../utils/notifications';
import { exportAllUserData, importUserData } from '../utils/storage';
import { t } from '../utils/i18n';
import { PWAInstallButton } from './PWAInstallButton';

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

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {t('settingsTitle', lang)}
            </h2>
            <p className="text-xs text-slate-400">
              {t('settingsSubtitle', lang)}
            </p>
          </div>
        </div>
      </div>

      {/* PWA Direct Installation Card */}
      <PWAInstallButton lang={lang} variant="settings" />

      {/* Notification status banner if import happened */}
      {importStatusMsg && (
        <div className={`p-4 rounded-xl border flex items-center gap-2 text-xs font-semibold animate-in fade-in ${
          importStatusMsg.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
            : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
        }`}>
          {importStatusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{importStatusMsg.text}</span>
        </div>
      )}

      {/* SECTION 1: PLANNING & PRODUCTIVITY PREFERENCES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Sliders className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Weekly Planning & Productivity Preferences
          </h3>
        </div>

        {/* App Theme (Dark / Light / System) */}
        <div className="space-y-1.5 pb-3 border-b border-slate-800/80">
          <label className="text-xs font-semibold text-slate-300 block flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Theme & Visual Appearance</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark Mode', desc: 'OLED Black', icon: Moon },
              { id: 'light', label: 'Light Mode', desc: 'Crisp Slate', icon: Sun },
              { id: 'system', label: 'System Auto', desc: 'Device Match', icon: Monitor },
            ].map((th) => {
              const Icon = th.icon;
              const isSelected = (settings.theme || 'dark') === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, theme: th.id as any })}
                  className={`p-2.5 rounded-xl text-xs font-medium border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{th.label}</span>
                  <span className="text-[9px] opacity-75">{th.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Format & Week Start Day */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Time Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('timeFormat', lang)}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, timeFormat: '24h' })}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                  (config.timeFormat || '24h') === '24h'
                    ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                24-Hour (14:30)
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, timeFormat: '12h' })}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                  config.timeFormat === '12h'
                    ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                12-Hour (2:30 PM)
              </button>
            </div>
          </div>

          {/* Week Start Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('weekStartDay', lang)}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, weekStartsOn: 1 })}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                  (config.weekStartsOn ?? 1) === 1
                    ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Monday (Default)
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ ...config, weekStartsOn: 0 })}
                className={`p-2.5 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                  config.weekStartsOn === 0
                    ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Sunday
              </button>
            </div>
          </div>
        </div>

        {/* Default Task Duration & Reminder Interval */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {t('defaultTaskDuration', lang)}
            </label>
            <div className="flex gap-1.5">
              {[15, 25, 30, 45, 60].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, defaultTaskDuration: mins })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer text-center ${
                    (config.defaultTaskDuration || 30) === mins
                      ? 'bg-blue-600 border-blue-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {t('defaultReminderInterval', lang)}
            </label>
            <div className="flex gap-1.5">
              {[
                { val: 0, label: '0m' },
                { val: 5, label: '5m' },
                { val: 10, label: '10m' },
                { val: 15, label: '15m' },
              ].map(item => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, defaultReminderMinutes: item.val })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer text-center ${
                    (config.defaultReminderMinutes ?? 10) === item.val
                      ? 'bg-blue-600 border-blue-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Focus & Break Durations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {t('defaultFocusDuration', lang)}
            </label>
            <div className="flex gap-1.5">
              {[20, 25, 30, 45, 50].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, defaultFocusDuration: mins })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer text-center ${
                    (config.defaultFocusDuration || 25) === mins
                      ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              {t('defaultBreakDuration', lang)}
            </label>
            <div className="flex gap-1.5">
              {[5, 10, 15, 20].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, defaultBreakDuration: mins })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer text-center ${
                    (config.defaultBreakDuration || 5) === mins
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Daily & Weekly Productivity Target Goals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Daily Focus Target (Hours)
            </label>
            <input
              type="number"
              min={1}
              max={16}
              step={0.5}
              value={Math.round(((config.dailyGoalMinutes || 240) / 60) * 10) / 10}
              onChange={(e) => onUpdateConfig({ ...config, dailyGoalMinutes: Math.round(Math.max(1, Number(e.target.value)) * 60) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Weekly Focus Target (Hours)
            </label>
            <input
              type="number"
              min={5}
              max={80}
              step={1}
              value={Math.round(((config.weeklyGoalMinutes || 1200) / 60) * 10) / 10}
              onChange={(e) => onUpdateConfig({ ...config, weeklyGoalMinutes: Math.round(Math.max(5, Number(e.target.value)) * 60) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: LANGUAGE SELECTOR (English & Amharic) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
          <Languages className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-slate-100">
            {t('languageSection', lang)}
          </h3>
        </div>

        <p className="text-xs text-slate-400">
          {t('selectLanguage', lang)}
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
              lang === 'en'
                ? 'bg-blue-950/60 border-blue-500 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div>
              <span className="text-xs font-bold block">English</span>
              <span className="text-[10px] text-slate-400">Default interface</span>
            </div>
            {lang === 'en' && <Check className="w-4 h-4 text-blue-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('am')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
              lang === 'am'
                ? 'bg-blue-950/60 border-blue-500 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div>
              <span className="text-xs font-bold block">አማርኛ (Amharic)</span>
              <span className="text-[10px] text-slate-400">የኢትዮጵያ ቋንቋ</span>
            </div>
            {lang === 'am' && <Check className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* SECTION 3: ALARM-STYLE SOUND & VIBRATION OPTIONS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Volume2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {t('alarmStyleSoundSection', lang)}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('alarmStyleSoundDesc', lang)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestAlarm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 shrink-0"
            title="Preview alarm sound melody"
          >
            <Play className={`w-3.5 h-3.5 ${isPlayingTest ? 'animate-spin' : ''}`} />
            <span>{t('testSound', lang)}</span>
          </button>
        </div>

        {/* Master Alarm Toggle */}
        <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              {t('timerAlarmToggle', lang)}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('timerAlarmToggleDesc', lang)}
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.timerAlarmEnabled}
            onChange={(e) => {
              onUpdateSettings({ ...settings, timerAlarmEnabled: e.target.checked });
            }}
            className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded focus:ring-blue-500"
          />
        </label>

        {settings.timerAlarmEnabled && (
          <div className="space-y-4 pt-1">
            {/* 1. Alarm Sound Melody Style Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                {t('alarmSoundLabel', lang)}
              </label>
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
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer text-left border ${
                      settings.timerAlarmSound === sound.id
                        ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 font-bold shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs block font-semibold">{sound.label}</span>
                      {settings.timerAlarmSound === sound.id && (
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Volume Level Slider & Quick Presets */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-200">
                <span className="font-semibold flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  {t('alarmVolumeLabel', lang)}
                </span>
                <span className="font-mono text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {Math.round((settings.alarmVolume ?? 0.8) * 100)}%
                </span>
              </div>
              
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={settings.alarmVolume ?? 0.8}
                onChange={(e) => {
                  onUpdateSettings({ ...settings, alarmVolume: Number(e.target.value) });
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              {/* Volume Preset Chips */}
              <div className="flex items-center justify-between gap-1.5 pt-1 text-[11px]">
                {[0.25, 0.5, 0.8, 1.0].map((vol) => (
                  <button
                    key={vol}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ ...settings, alarmVolume: vol });
                      playAlarmSound(settings.timerAlarmSound, vol);
                    }}
                    className={`flex-1 py-1 px-2 rounded-lg text-center font-mono font-medium transition cursor-pointer border ${
                      Math.abs((settings.alarmVolume ?? 0.8) - vol) < 0.04
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {Math.round(vol * 100)}%
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Alarm Repeat Interval Configuration */}
            <div>
              <div className="mb-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  {t('alarmRepeatIntervalLabel', lang)}
                </label>
                <p className="text-[11px] text-slate-400">
                  {lang === 'am'
                    ? 'ደወሉን እስኪያሸልቡ ወይም እስኪያሰናብቱ ድረስ የሚደወልበት ድግግሞሽ'
                    : 'Choose how often the alarm repeats until you snooze or dismiss'}
                </p>
              </div>

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
                      onClick={() => {
                        onUpdateSettings({ ...settings, alarmRepeatIntervalSeconds: opt.value });
                      }}
                      className={`p-2.5 rounded-xl text-xs font-medium text-left transition cursor-pointer border flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 font-bold shadow-sm ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />}
                      </div>
                      {opt.isSustained && (
                        <span className="text-[9px] text-amber-400/90 font-mono font-bold mt-1">
                          Sustained
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. 60-Second Warning Chime Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-200 block flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  {t('oneMinuteWarningToggle', lang)}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block leading-relaxed">
                  {t('oneMinuteWarningDesc', lang)}
                </span>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleTestWarning}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
                  title="Test 60-second warning chime"
                >
                  <Play className={`w-3 h-3 ${isPlayingWarningTest ? 'animate-spin' : ''}`} />
                  <span>Test Chime</span>
                </button>
                <input
                  type="checkbox"
                  checked={settings.oneMinuteWarningEnabled !== false}
                  onChange={(e) => {
                    onUpdateSettings({ ...settings, oneMinuteWarningEnabled: e.target.checked });
                  }}
                  className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Vibration Alerts Toggle & Test */}
        <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <span className="text-xs font-semibold text-slate-200 block flex items-center gap-1.5">
              <Vibrate className="w-3.5 h-3.5 text-blue-400" />
              {t('vibrationLabel', lang)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block leading-relaxed">
              {t('vibrationDesc', lang)}
            </span>
          </div>
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {typeof window !== 'undefined' && 'vibrate' in navigator && (
              <button
                type="button"
                onClick={handleTestVibration}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
                title="Test device vibration pulse"
              >
                <Vibrate className={`w-3 h-3 ${isTestingVibration ? 'animate-bounce' : ''}`} />
                <span>Test Pulse</span>
              </button>
            )}
            <input
              type="checkbox"
              checked={settings.vibrateEnabled !== false}
              onChange={(e) => {
                onUpdateSettings({ ...settings, vibrateEnabled: e.target.checked });
              }}
              className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Task Completion Sound */}
        <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-slate-800/80">
          <div>
            <span className="text-xs font-semibold text-slate-200 block">
              {t('taskCompletionSoundLabel', lang)}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('taskCompletionSoundDesc', lang)}
            </span>
          </div>
          <input
            type="checkbox"
            checked={settings.taskCompletionSound}
            onChange={(e) => {
              onUpdateSettings({ ...settings, taskCompletionSound: e.target.checked });
            }}
            className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded focus:ring-blue-500"
          />
        </label>
      </div>

      {/* SECTION 4: MOBILE & BROWSER NOTIFICATIONS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">
              {t('notificationSection', lang)}
            </h3>
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
            notificationState.permission === 'granted'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
              : notificationState.permission === 'denied'
              ? 'bg-rose-950 text-rose-400 border border-rose-800/80'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {notificationState.permission}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {t('notificationSectionDesc', lang)}
        </p>

        {notificationState.permission !== 'granted' ? (
          <button
            type="button"
            onClick={handleRequestPermission}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Smartphone className="w-4 h-4" />
            <span>{t('enableNotifications', lang)}</span>
          </button>
        ) : (
          <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t('notificationsGranted', lang)}</span>
          </div>
        )}

        {/* Persistent Task Reminders with Quiet Hours */}
        <div className="pt-2 border-t border-slate-800/80 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                {t('persistentRemindersToggle', lang)}
              </span>
              <span className="text-[11px] text-slate-400">
                {t('persistentRemindersDesc', lang)}
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.persistentReminders}
              onChange={(e) => {
                onUpdateSettings({ ...settings, persistentReminders: e.target.checked });
              }}
              className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded focus:ring-blue-500"
            />
          </label>

          {settings.persistentReminders && (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {t('reminderIntervalLabel', lang)}
                </label>
                <div className="flex gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, reminderIntervalMinutes: mins })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                        settings.reminderIntervalMinutes === mins
                          ? 'bg-blue-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center justify-between cursor-pointer mb-2">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('quietHoursLabel', lang)}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.quietHoursEnabled}
                    onChange={(e) => onUpdateSettings({ ...settings, quietHoursEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 text-blue-600 bg-slate-900 border-slate-700 rounded"
                  />
                </label>

                {settings.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Quiet From</span>
                      <input
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => onUpdateSettings({ ...settings, quietHoursStart: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Quiet Until</span>
                      <input
                        type="time"
                        value={settings.quietHoursEnd}
                        onChange={(e) => onUpdateSettings({ ...settings, quietHoursEnd: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono text-xs"
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Clock className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">
            {t('workdayPreferences', lang)}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">{t('workdayStarts', lang)}</label>
            <input
              type="time"
              value={config.workStart}
              onChange={(e) => onUpdateConfig({ ...config, workStart: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{t('workdayEnds', lang)}</label>
            <input
              type="time"
              value={config.workEnd}
              onChange={(e) => onUpdateConfig({ ...config, workEnd: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{t('lunchBreakStart', lang)}</label>
            <input
              type="time"
              value={config.lunchStart}
              onChange={(e) => onUpdateConfig({ ...config, lunchStart: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">{t('lunchDurationMinutes', lang)}</label>
            <input
              type="number"
              min={15}
              max={120}
              step={5}
              value={config.lunchDuration}
              onChange={(e) => onUpdateConfig({ ...config, lunchDuration: Math.max(15, Number(e.target.value)) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 6: DATA BACKUP, RESTORE & SYSTEM RESET */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-slate-100">
            {t('backupAndRestore', lang)}
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {t('personalPlanDataDesc', lang)}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Export Full JSON Backup */}
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-sm"
          >
            {copiedStatus ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4 text-blue-400" />}
            <span>{copiedStatus ? t('exported', lang) : t('exportFullBackup', lang)}</span>
          </button>

          {/* Import JSON Backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-sm"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>{t('importBackup', lang)}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-800/80">
          <a
            href="/plandroid-source.zip"
            download="plandroid-source.zip"
            className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            title="Download full project source code as a ZIP archive"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Project Source ZIP</span>
          </a>

          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            className="py-2 px-4 bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/60 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('clearAllPlans', lang)} ({plansCount})</span>
          </button>
        </div>

        {/* Clear Confirmation Modal */}
        {isConfirmClearOpen && (
          <div className="p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs text-rose-300 space-y-2 animate-in fade-in">
            <p className="font-semibold">{t('confirmClearTitle', lang)}</p>
            <p className="text-[11px] text-rose-400">{t('confirmClearDesc', lang)}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClearAllPlans();
                  setIsConfirmClearOpen(false);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition cursor-pointer active:scale-95"
              >
                {t('yesClearAll', lang)}
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
              >
                {t('cancel', lang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
