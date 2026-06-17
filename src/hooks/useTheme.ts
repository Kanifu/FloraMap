import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from '@/theme';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const { enabled: darkModeEnabled } = useFeatureFlag('dark_mode');
  return darkModeEnabled && scheme === 'dark' ? darkTheme : lightTheme;
}
