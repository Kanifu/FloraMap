import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../theme';

/**
 * Returns the colour palette that matches the device's system theme.
 * Components call `const theme = useTheme()` then use `theme.background`,
 * `theme.text`, etc. instead of hardcoded colour strings.
 *
 * Usage pattern:
 *   const theme = useTheme();
 *   const styles = makeStyles(theme);
 *   …
 *   const makeStyles = (t: Theme) => StyleSheet.create({ … });
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
