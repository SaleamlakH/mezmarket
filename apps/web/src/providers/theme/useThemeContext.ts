import { useContext } from 'react';
import type { ThemeContextValue } from './types';
import { ThemeContext } from './context';

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside a global ThemeProvider wrapper');
  }

  return context;
}
