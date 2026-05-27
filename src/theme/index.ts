// FloraMap design tokens — light & dark
export const lightTheme = {
  // Backgrounds
  background:       '#f5f7f2',
  card:             '#ffffff',
  cardAlt:          '#f1f8f3',
  // Text
  text:             '#1a1a1a',
  textSecondary:    '#6b705c',
  textMuted:        '#aaa',
  textInverse:      '#ffffff',
  // Borders
  border:           '#e9ecef',
  borderLight:      '#b7e4c7',
  // Brand greens
  primary:          '#2d6a4f',
  primaryDark:      '#1b4332',
  primaryLight:     '#d8f3dc',
  primaryLighter:   '#f1f8f3',
  // Semantic
  danger:           '#e63946',
  dangerLight:      '#fff5f5',
  dangerBorder:     '#f4bfc0',
  warning:          '#ffb703',
  warningLight:     '#fff3cd',
  info:             '#0a558c',
  infoLight:        '#e0f0ff',
  infoBorder:       '#90c8f0',
  // Map
  mapBackground:    '#eaf4ec',
  mapGrid:          '#b7e4c7',
  // Tab bar
  tabBar:           '#ffffff',
  tabBorder:        '#e9ecef',
  tabActive:        '#2d6a4f',
  tabInactive:      '#aaa',
};

export const darkTheme = {
  // Backgrounds
  background:       '#0f1a0f',
  card:             '#1a2d1a',
  cardAlt:          '#1e331e',
  // Text
  text:             '#e8f5e9',
  textSecondary:    '#9cbe9e',
  textMuted:        '#5a7a5c',
  textInverse:      '#0f1a0f',
  // Borders
  border:           '#2a3d2a',
  borderLight:      '#2a5c3a',
  // Brand greens
  primary:          '#6abf7a',
  primaryDark:      '#4c9c5a',
  primaryLight:     '#1a3d25',
  primaryLighter:   '#162914',
  // Semantic
  danger:           '#ff6b6b',
  dangerLight:      '#2d1515',
  dangerBorder:     '#5c2a2a',
  warning:          '#ffd166',
  warningLight:     '#2d2415',
  info:             '#74b9ff',
  infoLight:        '#0f2035',
  infoBorder:       '#1a3a5c',
  // Map
  mapBackground:    '#162914',
  mapGrid:          '#1e4029',
  // Tab bar
  tabBar:           '#0f1a0f',
  tabBorder:        '#2a3d2a',
  tabActive:        '#6abf7a',
  tabInactive:      '#5a7a5c',
};

export type Theme = typeof lightTheme;
