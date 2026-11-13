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
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg pb-safe"
    >
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition cursor-pointer select-none relative ${
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
              <span className="text-[11px] mt-1 tracking-tight">
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
