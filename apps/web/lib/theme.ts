export type Theme = 'light' | 'dark';

export interface ThemeConfig {
  name: Theme;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
    input: string;
    ring: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    background: string;
    glass: string;
  };
  glassmorphism: {
    background: string;
    backdrop: string;
    border: string;
  };
}

export const themes: Record<Theme, ThemeConfig> = {
  light: {
    name: 'light',
    colors: {
      background: '#ffffff',
      foreground: '#0a0a0a',
      card: '#ffffff',
      cardForeground: '#0a0a0a',
      primary: '#0a0a0a',
      primaryForeground: '#ffffff',
      secondary: '#f5f5f5',
      secondaryForeground: '#0a0a0a',
      muted: '#f5f5f5',
      mutedForeground: '#737373',
      accent: '#f5f5f5',
      accentForeground: '#0a0a0a',
      border: '#e5e5e5',
      input: '#e5e5e5',
      ring: '#0a0a0a',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    },
    glassmorphism: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdrop: 'blur(20px) saturate(180%)',
      border: 'rgba(255, 255, 255, 0.3)',
    },
  },
  dark: {
    name: 'dark',
    colors: {
      background: '#0a0a0a',
      foreground: '#fafafa',
      card: '#1a1a1a',
      cardForeground: '#fafafa',
      primary: '#fafafa',
      primaryForeground: '#0a0a0a',
      secondary: '#262626',
      secondaryForeground: '#fafafa',
      muted: '#262626',
      mutedForeground: '#a3a3a3',
      accent: '#262626',
      accentForeground: '#fafafa',
      border: '#404040',
      input: '#404040',
      ring: '#fafafa',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
    },
    glassmorphism: {
      background: 'rgba(26, 26, 26, 0.7)',
      backdrop: 'blur(20px) saturate(180%)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
  },
};

export function getTheme(theme: Theme): ThemeConfig {
  return themes[theme];
}

export function getThemeCSSVariables(theme: Theme): string {
  const config = themes[theme];
  const vars: string[] = [];

  Object.entries(config.colors).forEach(([key, value]) => {
    vars.push(`--color-${key}: ${value};`);
  });

  Object.entries(config.gradients).forEach(([key, value]) => {
    vars.push(`--gradient-${key}: ${value};`);
  });

  Object.entries(config.glassmorphism).forEach(([key, value]) => {
    vars.push(`--glass-${key}: ${value};`);
  });

  return vars.join('\n  ');
}
