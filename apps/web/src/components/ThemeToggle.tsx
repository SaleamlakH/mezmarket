import { useThemeContext } from '@/providers/theme/useThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  /** `icon` is the compact header control; `nav` matches the sidebar links. */
  variant?: 'icon' | 'nav';
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeContext();
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;

  if (variant === 'nav') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        aria-label={label}
        title={label}
        className="focus-ring flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-(--text-muted) transition-colors hover:text-(--text)"
      >
        <span className="h-5 w-5">
          {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
        </span>
        <span className="flex-1 text-left">Theme</span>
        <span className="text-[11px] font-medium text-(--text-muted)">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={label}
      title={theme === 'light' ? 'Dark mode' : 'Light mode'}
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
