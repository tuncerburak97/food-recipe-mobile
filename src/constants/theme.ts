/**
 * Design tokens. Colors are semantic roles with a light and a dark palette. Layout follows a
 * two-tone pattern: `background` is the page/chrome, `surface` is the sheet and cards on top of it.
 *
 * Both modes share the fintrack-mobile look (Light: a cool light gray page, white sheet and cards,
 * navy text. Dark: a near-black page above a dark sheet) with the app's own orange accent.
 *
 * - accent: fills, icons and selection marks. accentStrong: behind white text (main buttons).
 * - accentText: accent dark enough for small text. peach/peachSoft: photo placeholders, avatars.
 * - success/warning/danger (+Soft): status only, never decoration.
 */
export const Colors = {
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceMuted: '#EFF2F5',
    border: '#E6E9EE',
    text: '#0D1421',
    textSecondary: '#58667E',
    textTertiary: '#808A9D',
    accent: '#DE6438',
    accentStrong: '#C4512A',
    accentSoft: '#FCE8DD',
    accentText: '#B54D26',
    onAccent: '#FFFFFF',
    peach: '#E3E8F1',
    peachSoft: '#F3F5F9',
    onPeach: '#0D1421',
    ink: '#0D1421',
    onInk: '#FFFFFF',
    success: '#16794A',
    successSoft: '#E5F2EA',
    warning: '#8A5A00',
    warningSoft: '#FFF6E5',
    danger: '#C81E0A',
    dangerSoft: '#FBE7E4',
    shadow: 'rgba(13, 20, 33, 0.06)',
  },
  dark: {
    background: '#050607',
    surface: '#0F1113',
    surfaceMuted: '#1A1D21',
    border: '#272B30',
    text: '#EEF1F2',
    textSecondary: '#A3ABAF',
    textTertiary: '#7D868B',
    accent: '#EC7A4E',
    accentStrong: '#C4512A',
    accentSoft: '#43271B',
    accentText: '#F59A76',
    onAccent: '#FFFFFF',
    peach: '#1F2328',
    peachSoft: '#16191C',
    onPeach: '#EEF1F2',
    ink: '#EEF1F2',
    onInk: '#0B0C0D',
    success: '#3FCB86',
    successSoft: '#11301F',
    warning: '#F0B44C',
    warningSoft: '#2D2412',
    danger: '#FF6B5B',
    dangerSoft: '#3A1714',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

/**
 * One typeface everywhere: Plus Jakarta Sans. Custom fonts ignore `fontWeight` on Android, so every
 * weight is its own family; `Text` picks the family from the weight.
 */
export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeight = '400' | '500' | '600' | '700' | '800';

export function fontFor(weight: FontWeight | undefined): string {
  switch (weight) {
    case '500':
      return Fonts.medium;
    case '600':
      return Fonts.semibold;
    case '700':
      return Fonts.bold;
    case '800':
      return Fonts.extrabold;
    default:
      return Fonts.regular;
  }
}

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const Radius = {
  /** Tags, small marks. */
  sm: 8,
  /** Inputs, small tiles. */
  md: 14,
  /** Cards and grouped lists. */
  lg: 18,
  /** Photo cards, feature tiles. */
  xl: 24,
  /** The rounded top of a sheet over the page or a photo. */
  sheet: 28,
  pill: 999,
} as const;

export const ScreenPadding = Spacing.xl;
/** Smallest tappable size. Generous on purpose: the app is used with busy, wet hands. */
export const TouchSize = 48;
/** Height of the main buttons. */
export const ButtonHeight = 52;
/** Height of the custom tab bar (without the safe area), used to keep content above it. */
export const TabBarHeight = 64;
