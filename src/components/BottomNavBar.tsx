import React from 'react';
import type { Language, MainSection } from '../types';
import { CalendarCheck2, CalendarDays, BarChart3, Settings } from 'lucide-react';
import { t } from '../utils/i18n';

export type { MainSection };

interface BottomNavBarProps {
  activeSection: MainSection;
  onChangeSection: (section: MainSection) => void;
  plansCount?: number;
  lang?: Language;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeSection,
  onChangeSection,
  plansCount,
  lang = 'en',
}) => {
  const navItems: { id: MainSection; labelKey: 'plans' | 'weekly' | 'analytics' | 'settings'; icon: React.FC<{ className?: string }> }[] = [
    { id: 'plans', labelKey: 'plans', icon: CalendarCheck2 },
    { id: 'weekly', labelKey: 'weekly', icon: CalendarDays },
    { id: 'analytics', labelKey: 'analytics', icon: BarChart3 },
    { id: 'settings', labelKey: 'settings', icon: Settings },
  ];

  const handleSelect = (section: MainSection) => {
    if (activeSection !== section) {
      onChangeSection(section);
    }
  };

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 rounded-2xl bg-surface-panel/95 border border-border-default backdrop-blur-lg shadow-2xl shadow-black/40"
    >
      <div className="px-3 sm:px-5 h-16 flex items-center justify-between sm:justify-around gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`shrink-0 min-w-[72px] sm:flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-200 cursor-pointer select-none relative ${
                isActive
                  ? 'text-blue-400 bg-blue-600/20 shadow-sm shadow-blue-500/20'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-blue-400' : 'text-text-muted'}`} />
                {item.id === 'plans' && typeof plansCount === 'number' && plansCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-mono font-bold rounded-full border border-white">
                    {plansCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight whitespace-nowrap font-medium">
                {t(item.labelKey, lang)}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
