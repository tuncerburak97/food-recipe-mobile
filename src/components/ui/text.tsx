import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { fontFor, type FontWeight, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The type scale. One family (Plus Jakarta Sans); hierarchy comes from size and weight only.
 * - display / title / title2 / title3: screen titles, recipe names, section and card titles.
 * - headline: the strong line of a row or button. body / callout / subhead: reading text.
 * - footnote / caption: secondary facts. overline: small spaced capitals for labels (pass upperTr()).
 * - numeral: large tabular figures (timers, step numbers, stats).
 */
const VARIANTS = {
  display: { size: 28, line: 34, weight: '700', tracking: -0.7 },
  title: { size: 22, line: 28, weight: '700', tracking: -0.45 },
  title2: { size: 18, line: 24, weight: '700', tracking: -0.25 },
  title3: { size: 16, line: 22, weight: '600', tracking: -0.15 },
  headline: { size: 15, line: 20, weight: '600', tracking: -0.1 },
  body: { size: 15, line: 23, weight: '400', tracking: 0 },
  /** Kept for older call sites: a calm secondary paragraph. */
  quote: { size: 15, line: 23, weight: '400', tracking: 0 },
  callout: { size: 14, line: 20, weight: '400', tracking: 0 },
  subhead: { size: 13, line: 18, weight: '500', tracking: 0 },
  footnote: { size: 12, line: 16, weight: '500', tracking: 0 },
  caption: { size: 11, line: 14, weight: '600', tracking: 0.1 },
  overline: { size: 11, line: 14, weight: '700', tracking: 0.9 },
  numeral: { size: 40, line: 46, weight: '700', tracking: -1.2 },
} satisfies Record<string, { size: number; line: number; weight: FontWeight; tracking: number }>;

export type TextVariant = keyof typeof VARIANTS;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: ThemeColor;
  /** Overrides `color` with a raw value, e.g. white text on a photo. */
  tint?: string;
  /** Overrides the variant's weight; mapped to the matching font file. */
  weight?: FontWeight | TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

export function Text({ variant = 'body', color = 'text', tint, weight, align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const v = VARIANTS[variant];
  const w = (typeof weight === 'string' && /^[45678]00$/.test(weight) ? weight : v.weight) as FontWeight;
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        {
          fontFamily: fontFor(w),
          fontSize: v.size,
          lineHeight: v.line,
          letterSpacing: v.tracking,
          color: tint ?? colors[color],
        },
        variant === 'numeral' ? { fontVariant: ['tabular-nums'] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
