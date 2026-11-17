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
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 rounded-2xl bg-slate-900/95 border border-slate-800/90 backdrop-blur-lg shadow-2xl shadow-black/40"
    >
      <div className="px-2 sm:px-4 h-16 flex items-center justify-between sm:justify-around gap-1 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`shrink-0 min-w-[72px] sm:flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition cursor-pointer select-none relative ${
                isActive
                  ? 'text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-400' : ''}`} />
                {item.id === 'plans' && typeof plansCount === 'number' && plansCount > 0 && (
                  <span className="absolute -top-1 -right-2.5 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-mono font-bold rounded-full">
                    {plansCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight whitespace-nowrap">
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
