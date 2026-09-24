import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId =
  | 'gfm-purple'
  | 'pds-teal'
  | 'gfm-gold'
  | 'cobalt-blue'
  | 'emerald-luxe'
  | 'rose-quartz'
  | 'midnight-dark';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  shortName: string;
  brand: 'GFM' | 'PDS' | 'Luxe';
  brandFullName: string;
  styleLabel: string;
  styleType: 'glossy' | 'dark';
  description: string;
  sourceUrl: string;
  isDark: boolean;
  colors: {
    primary: string;
    primaryHover: string;
    primaryGradient: string;
    secondary: string;
    accent: string;
    border: string;
    glow: string;
    swatches: [string, string, string];
  };
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'gfm-purple': {
    id: 'gfm-purple',
    name: 'GFM Royal Violet',
    shortName: 'Royal Violet',
    brand: 'GFM',
    brandFullName: 'Gold Flex Marketing',
    styleLabel: 'Glossy Violet',
    styleType: 'glossy',
    description: 'Signature Gold Flex Marketing royal violet (#7C52F5) with luminous lavender glass surfaces and amethyst ambient glows.',
    sourceUrl: 'https://goldflexmarketing.com/',
    isDark: false,
    colors: {
      primary: '#7C52F5',
      primaryHover: '#683EE6',
      primaryGradient: 'linear-gradient(135deg, #7C52F5 0%, #683EE6 100%)',
      secondary: '#2A1C94',
      accent: '#A78AFD',
      border: 'rgba(198, 193, 243, 0.75)',
      glow: 'rgba(124, 82, 245, 0.25)',
      swatches: ['#7C52F5', '#A78AFD', '#2A1C94'],
    },
  },
  'pds-teal': {
    id: 'pds-teal',
    name: 'PDS Oceanic Teal',
    shortName: 'Oceanic Teal',
    brand: 'PDS',
    brandFullName: 'Physicians Digital Services',
    styleLabel: 'Glossy Cyan',
    styleType: 'glossy',
    description: 'Physicians Digital Services clinical cyan and electric teal with aqua-marine frosted glass, sea-glass borders, and refreshing cyan reflections.',
    sourceUrl: 'https://physiciansdigitalservices.com/',
    isDark: false,
    colors: {
      primary: '#00B8AE',
      primaryHover: '#009E96',
      primaryGradient: 'linear-gradient(135deg, #00E5D9 0%, #00B8AE 50%, #00847E 100%)',
      secondary: '#133447',
      accent: '#00D1C7',
      border: 'rgba(0, 209, 199, 0.38)',
      glow: 'rgba(0, 209, 199, 0.32)',
      swatches: ['#00E5D9', '#00B8AE', '#133447'],
    },
  },
  'gfm-gold': {
    id: 'gfm-gold',
    name: 'GFM Amber Gold',
    shortName: 'Amber Gold',
    brand: 'GFM',
    brandFullName: 'Gold Flex Marketing',
    styleLabel: 'Glossy Amber',
    styleType: 'glossy',
    description: 'Executive Gold Flex warm amber and honey champagne with sunlit gilded glass, bronze luster, and vibrant warm golden gradients.',
    sourceUrl: 'https://goldflexmarketing.com/',
    isDark: false,
    colors: {
      primary: '#D97706',
      primaryHover: '#B45309',
      primaryGradient: 'linear-gradient(135deg, #FFBE00 0%, #F59E0B 50%, #D97706 100%)',
      secondary: '#78350F',
      accent: '#FFBE00',
      border: 'rgba(245, 158, 11, 0.42)',
      glow: 'rgba(245, 158, 11, 0.30)',
      swatches: ['#FFBE00', '#F59E0B', '#B45309'],
    },
  },
  'cobalt-blue': {
    id: 'cobalt-blue',
    name: 'Cobalt Electric',
    shortName: 'Cobalt Blue',
    brand: 'Luxe',
    brandFullName: 'Executive Cobalt Sapphire',
    styleLabel: 'Glossy Cobalt',
    styleType: 'glossy',
    description: 'High-impact glossy electric cobalt and sapphire glaze with crystal clear reflections, ocean azure gradients, and deep indigo accents.',
    sourceUrl: 'https://goldflexmarketing.com/',
    isDark: false,
    colors: {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      primaryGradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
      secondary: '#1E3A8A',
      accent: '#60A5FA',
      border: 'rgba(37, 99, 235, 0.35)',
      glow: 'rgba(37, 99, 235, 0.30)',
      swatches: ['#60A5FA', '#2563EB', '#1E3A8A'],
    },
  },
  'emerald-luxe': {
    id: 'emerald-luxe',
    name: 'Emerald Luxe',
    shortName: 'Emerald Luxe',
    brand: 'Luxe',
    brandFullName: 'Executive Emerald Jade',
    styleLabel: 'Glossy Emerald',
    styleType: 'glossy',
    description: 'Luminous jade and emerald crystal glass with frosted mint highlights, gleaming jewel gradients, and refined viridian borders.',
    sourceUrl: 'https://physiciansdigitalservices.com/',
    isDark: false,
    colors: {
      primary: '#059669',
      primaryHover: '#047857',
      primaryGradient: 'linear-gradient(135deg, #34D399 0%, #059669 50%, #047857 100%)',
      secondary: '#064E3B',
      accent: '#10B981',
      border: 'rgba(5, 150, 105, 0.36)',
      glow: 'rgba(16, 185, 129, 0.30)',
      swatches: ['#34D399', '#059669', '#064E3B'],
    },
  },
  'rose-quartz': {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    shortName: 'Rose Quartz',
    brand: 'Luxe',
    brandFullName: 'Executive Rose Quartz',
    styleLabel: 'Glossy Rose',
    styleType: 'glossy',
    description: 'Glossy rose quartz and coral amethyst with prismatic crystal reflections, vivid raspberry highlights, and luminous warm glow.',
    sourceUrl: 'https://goldflexmarketing.com/',
    isDark: false,
    colors: {
      primary: '#E11D48',
      primaryHover: '#BE123C',
      primaryGradient: 'linear-gradient(135deg, #FB7185 0%, #E11D48 50%, #BE123C 100%)',
      secondary: '#881337',
      accent: '#FDA4AF',
      border: 'rgba(225, 29, 72, 0.35)',
      glow: 'rgba(225, 29, 72, 0.30)',
      swatches: ['#FB7185', '#E11D48', '#881337'],
    },
  },
  'midnight-dark': {
    id: 'midnight-dark',
    name: 'Obsidian Midnight',
    shortName: 'Obsidian Night',
    brand: 'GFM',
    brandFullName: 'Gold Flex Dark Edition',
    styleLabel: 'Dark Edition',
    styleType: 'dark',
    description: 'The darker luxury option: deep cosmic obsidian with illuminated neon violet & cyan glowing rims and ultra-crisp typography.',
    sourceUrl: 'https://goldflexmarketing.com/',
    isDark: true,
    colors: {
      primary: '#8963FB',
      primaryHover: '#7C52F5',
      primaryGradient: 'linear-gradient(135deg, #A78AFD 0%, #8963FB 50%, #00D1C7 100%)',
      secondary: '#090714',
      accent: '#00D1C7',
      border: 'rgba(137, 99, 251, 0.35)',
      glow: 'rgba(137, 99, 251, 0.38)',
      swatches: ['#090714', '#8963FB', '#00D1C7'],
    },
  },
};

export const THEME_LIST: ThemeDefinition[] = [
  THEMES['gfm-purple'],
  THEMES['pds-teal'],
  THEMES['gfm-gold'],
  THEMES['cobalt-blue'],
  THEMES['emerald-luxe'],
  THEMES['rose-quartz'],
  THEMES['midnight-dark'],
];

const STORAGE_KEY = 'gfm_executive_app_theme';

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'gfm-purple';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES[saved]) {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return 'gfm-purple';
}

export function applyThemeToDOM(themeId: ThemeId) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = THEMES[themeId] || THEMES['gfm-purple'];

  root.setAttribute('data-theme', theme.id);

  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update theme meta color for mobile status bar
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', theme.isDark ? '#090714' : theme.colors.swatches[0]);

  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
  } catch (e) {
    // ignore
  }
}

interface ThemeContextValue {
  currentTheme: ThemeId;
  themeConfig: ThemeDefinition;
  setTheme: (themeId: ThemeId) => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(getStoredTheme);

  useEffect(() => {
    applyThemeToDOM(currentTheme);
  }, [currentTheme]);

  const setTheme = (themeId: ThemeId) => {
    if (THEMES[themeId]) {
      setCurrentThemeState(themeId);
      applyThemeToDOM(themeId);
    }
  };

  const themeConfig = THEMES[currentTheme] || THEMES['gfm-purple'];

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeConfig,
        setTheme,
        availableThemes: THEME_LIST,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
