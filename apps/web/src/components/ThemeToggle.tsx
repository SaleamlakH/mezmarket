import { useThemeContext } from '@/providers/theme/useThemeContext';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="
        p-2 rounded-lg flex items-center justify-center
        border border-(--border)
        bg-(--surface-primary) text-(--text-muted) sm:bg-(--surface-secondary)
        hover:text-(--text) hover:border-(--accent)
        transition-colors duration-150 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)
      "
    >
      {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
    </button>
  );
}
