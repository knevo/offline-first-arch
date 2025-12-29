import { useColorSchemeContext } from '@/contexts/ColorSchemeContext';

export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useColorSchemeContext();
  return colorScheme;
}
