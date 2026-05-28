/**
 * FloraMap centralized color palette.
 * Use these in all new components — avoid hardcoded hex values in new code.
 * Do not bulk-replace existing colors in one pass; migrate gradually.
 */
export const colors = {
  primary:       '#2d6a4f',
  primaryDark:   '#1b4332',
  primaryLight:  '#52b788',
  surface:       '#d8f3dc',
  surfaceLight:  '#f1f8f3',
  border:        '#b7e4c7',
  textPrimary:   '#1b4332',
  textSecondary: '#6b705c',
  textMuted:     '#aaa',
  danger:        '#e63946',
  warning:       '#ffb703',
  infoBlue:      '#3a86ff',
  soil:          '#1a0f00',
} as const;

// ── Theme objects (light / dark) used by FeedbackModal + useTheme ─────────────

export interface Theme {
  primary:       string;
  primaryDark:   string;
  primaryLight:  string;
  background:    string;
  card:          string;
  border:        string;
  text:          string;
  textSecondary: string;
  textMuted:     string;
}

export const lightTheme: Theme = {
  primary:       colors.primary,
  primaryDark:   colors.primaryDark,
  primaryLight:  colors.primaryLight,
  background:    '#fff',
  card:          '#fff',
  border:        colors.border,
  text:          colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted:     colors.textMuted,
};

// Dark mode is deferred per spec — reuse light theme values for now
export const darkTheme: Theme = lightTheme;
