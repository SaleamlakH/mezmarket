import { useContext } from 'react';
import { ThemeContext } from '../context/theme/theme-context';
import type { ThemeContextValue } from '../context/theme/theme-types';

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside a global ThemeProvider wrapper');
  }

  return context;
}
