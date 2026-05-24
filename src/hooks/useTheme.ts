/**
 * useTheme — returns the correct colour token set based on the device colour scheme.
 * Issue #12 — dark mode support.
 */

import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../theme';

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}
