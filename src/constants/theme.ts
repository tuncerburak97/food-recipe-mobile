/**
 * Design tokens. Colors are semantic roles with a light and a dark palette (values unchanged from
 * the cookbook theme: cream page, white sheet, warm orange accent). Layout follows a two-tone
 * pattern: `background` is the page/chrome, `surface` is the sheet and cards on top of it.
 *
 * - accent: fills, icons and selection marks. accentStrong: behind white text (main buttons).
 * - accentText: accent dark enough for small text. peach/peachSoft: warm photo placeholders.
 * - success/warning/danger (+Soft): status only, never decoration.
 */
export const Colors = {
  light: {
    background: '#FAF7F1',
    surface: '#FFFFFF',
    surfaceMuted: '#F4EEE6',
    border: '#EAE1D5',
    text: '#1E1C1A',
    textSecondary: '#67615A',
    textTertiary: '#9E978E',
    accent: '#DE6438',
    accentStrong: '#C4512A',
    accentSoft: '#FCE8DD',
    accentText: '#B54D26',
    onAccent: '#FFFFFF',
    peach: '#F8DFC8',
    peachSoft: '#FCF0E4',
    onPeach: '#1E1C1A',
    ink: '#1E1C1A',
    onInk: '#FAF8F4',
    success: '#4F7A3A',
    successSoft: '#E8F0E1',
    warning: '#A86B12',
    warningSoft: '#F8EEDC',
    danger: '#C2413B',
    dangerSoft: '#F9E3E2',
    shadow: 'rgba(30, 28, 26, 0.07)',
  },
  dark: {
    background: '#151413',
    surface: '#1F1D1B',
    surfaceMuted: '#2A2724',
    border: '#35312D',
    text: '#F4F0EA',
    textSecondary: '#BDB5AB',
    textTertiary: '#8A837A',
    accent: '#EC7A4E',
    accentStrong: '#C4512A',
    accentSoft: '#43271B',
    accentText: '#F59A76',
    onAccent: '#FFFFFF',
    peach: '#3A2C22',
    peachSoft: '#2A221C',
    onPeach: '#F4F0EA',
    ink: '#F4F0EA',
    onInk: '#1E1C1A',
    success: '#8CC36A',
    successSoft: '#22301A',
    warning: '#E3A440',
    warningSoft: '#3A2C14',
    danger: '#F06A6A',
    dangerSoft: '#3B1A1A',
    shadow: 'rgba(0, 0, 0, 0.4)',
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
