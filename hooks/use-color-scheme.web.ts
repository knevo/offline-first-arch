import { useColorSchemeContext } from '@/contexts/ColorSchemeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const { colorScheme } = useColorSchemeContext();
  return colorScheme;
}
