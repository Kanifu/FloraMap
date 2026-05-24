/**
 * FloraMap colour tokens — light and dark.
 * Used via the useTheme() hook so all screens auto-follow the system setting.
 * Issue #12 — dark mode support.
 */

export const lightTheme = {
  background:    '#f5f7f2',
  card:          '#ffffff',
  text:          '#1a1a1a',
  textSecondary: '#666666',
  textMuted:     '#999999',
  border:        '#e8eee4',
  primary:       '#4a7c59',
  primaryLight:  '#e8f4ec',
  primaryDark:   '#2d6a4f',
  danger:        '#e63946',
  warning:       '#ffb703',
  mapBackground: '#e8f5e9',
  mapGrid:       '#b7e4c7',
  mapText:       '#1b4332',
};

export const darkTheme = {
  background:    '#0f1a0f',
  card:          '#1a2d1a',
  text:          '#e8f5e9',
  textSecondary: '#9cbe9e',
  textMuted:     '#5a7a5c',
  border:        '#2a3d2a',
  primary:       '#6abf7a',
  primaryLight:  '#1a3d25',
  primaryDark:   '#4a9c5a',
  danger:        '#ff6b6b',
  warning:       '#ffd166',
  mapBackground: '#0d1f0d',
  mapGrid:       '#1a3a1a',
  mapText:       '#a8d8a8',
};

export type Theme = typeof lightTheme;
