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
  primaryBg:     string;
  background:    string;
  card:          string;
  cardAlt:       string;
  border:        string;
  borderLight:   string;
  text:          string;
  textSecondary: string;
  textMuted:     string;
  danger:        string;
  dangerLight:   string;
  warning:       string;
  warningLight:  string;
  info:          string;
  infoLight:     string;
  overlay:       string;
}

export const lightTheme: Theme = {
  primary:       '#2d6a4f',
  primaryDark:   '#1b4332',
  primaryLight:  '#d8f3dc',
  primaryBg:     '#f1f8f3',
  background:    '#f5f7f2',
  card:          '#ffffff',
  cardAlt:       '#f8f9fa',
  border:        '#e9ecef',
  borderLight:   '#b7e4c7',
  text:          '#1a1a1a',
  textSecondary: '#6b705c',
  textMuted:     '#aaaaaa',
  danger:        '#e63946',
  dangerLight:   '#fff5f5',
  warning:       '#ffb703',
  warningLight:  '#fff9e6',
  info:          '#3a86ff',
  infoLight:     '#e0f0ff',
  overlay:       'rgba(0,0,0,0.45)',
};

export const darkTheme: Theme = {
  primary:       '#52b788',
  primaryDark:   '#74c69d',
  primaryLight:  '#1a3d25',
  primaryBg:     '#0f2a18',
  background:    '#0f1a0f',
  card:          '#1a2d1a',
  cardAlt:       '#1e2e1e',
  border:        '#2a3d2a',
  borderLight:   '#2a5c3a',
  text:          '#e8f5e9',
  textSecondary: '#9cbe9e',
  textMuted:     '#5a7a5c',
  danger:        '#ff6b6b',
  dangerLight:   '#2d1010',
  warning:       '#ffd166',
  warningLight:  '#2a2010',
  info:          '#74b9ff',
  infoLight:     '#0d1a2d',
  overlay:       'rgba(0,0,0,0.65)',
};
