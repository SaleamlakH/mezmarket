import { ThemeContext } from './context';
import { useThemeInternal } from './useThemeInternal';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useThemeInternal();
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
