import { useCallback, useEffect, useMemo, useState } from 'react';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'Mez-Theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEY);

    if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return useMemo(
    () => ({
      isDark: theme === 'dark',
      theme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );
}
