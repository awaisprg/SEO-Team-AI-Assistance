import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Check,
  Crown,
  Waves,
  Sun,
  Zap,
  Gem,
  Sparkles,
  Moon,
  LucideIcon,
} from 'lucide-react';
import { useTheme, ThemeId, ThemeDefinition } from '../utils/theme';

interface ThemeOptionItem {
  id: ThemeId;
  name: string;
  shortName: string;
  icon: LucideIcon;
  isDark: boolean;
}

const THEME_ICONS: Record<ThemeId, LucideIcon> = {
  'gfm-purple': Crown,
  'pds-teal': Waves,
  'gfm-gold': Sun,
  'cobalt-blue': Zap,
  'emerald-luxe': Gem,
  'rose-quartz': Sparkles,
  'midnight-dark': Moon,
};

export const ThemeDropdown: React.FC = () => {
  const { currentTheme, setTheme, availableThemes, themeConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const themeItems: ThemeOptionItem[] = availableThemes.map((t: ThemeDefinition) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    icon: THEME_ICONS[t.id] || Sparkles,
    isDark: t.isDark,
  }));

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Icon Button Trigger */}
      <button
        type="button"
        id="theme-dropdown-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative shadow-2xs group select-none active:scale-[0.98] ${
          isOpen
            ? 'bg-white dark:bg-slate-700 text-[var(--theme-primary)] border-2 border-[var(--theme-primary)] shadow-xs ring-2 ring-[var(--theme-primary)]/15'
            : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        title={`Change Theme: ${themeConfig.shortName}`}
        aria-label="Change Theme"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Palette className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-105" />

        {/* Integrated neat color accent indicator */}
        <span
          className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full ring-1 ring-white dark:ring-slate-900 shadow-2xs"
          style={{ background: themeConfig.colors.primaryGradient }}
        />
      </button>

      {/* Theme Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/90 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-left focus:outline-hidden"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="theme-dropdown-btn"
        >
          {/* Header Label */}
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Theme Palette
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-400">
              7 Options
            </span>
          </div>

          {/* Theme List */}
          <div className="space-y-0.5" role="none">
            {themeItems.map((item) => {
              const Icon = item.icon;
              const isSelected = item.id === currentTheme;
              const themeDef = availableThemes.find((t) => t.id === item.id);
              const gradient = themeDef?.colors.primaryGradient;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTheme(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer group text-left ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Swatch & Icon Container */}
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white shadow-2xs shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: gradient }}
                    >
                      <Icon className="w-3.5 h-3.5 drop-shadow-xs" />
                    </div>

                    {/* Short Theme Name */}
                    <span className="truncate tracking-tight font-medium">
                      {item.shortName}
                    </span>
                  </div>

                  {/* Active Checkmark or Dark Tag */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.isDark && (
                      <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Dark
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--theme-primary)] stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
