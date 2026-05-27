import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../theme';

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
