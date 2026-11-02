# Design system

The app should feel calm, sharp and trustworthy, like a well-made tool, and be effortless to use
with busy hands in a kitchen. Ease of use comes first; every visual rule below serves it.

## Principles

1. **One obvious next step.** Each screen has at most one primary (accent) button, placed at the
   bottom in thumb reach (`StickyFooter` / wizard footer). Everything else is secondary, outline or
   ghost.
2. **Plain words, big targets.** Labels are short Turkish sentences in "sen" form. Every tappable
   thing is at least 48 pt. Icon-only controls always have an `accessibilityLabel`.
3. **Nothing moves on by itself.** Choosing an answer never advances a flow; the user taps "Devam".
   Destructive actions ask first.
4. **Every state is designed.** Loading (skeleton or `LoadingState`), empty (`EmptyState` with an
   action), error (`ErrorState` with retry) and success (haptic + toast or a clear screen change).
5. **Restraint.** Color, icons and motion carry meaning, never decoration.

## Color (`src/constants/theme.ts`, read through `useTheme()`)

The palette values are fixed. Never add hex colors in components; the only exceptions are
`#FFFFFF` text on photos and dark `rgba(…)` scrims over photos/video.

Both modes follow the fintrack-mobile look with the app's own orange accent. Light: a cool light
gray page (`#F5F7FA`), white sheet and cards, navy text (`#0D1421`) and slate supporting text.
Dark: a near-black page (`#050607`) above a dark sheet (`#0F1113`). The orange (`accentStrong`
`#C4512A`) is the same in both modes. The toast action uses `onInk`, never the accent, so it reads
on the toast in either mode.

| Role | Use |
| --- | --- |
| `background` | The page / chrome behind headers (light gray in light mode). |
| `surface` | White sheets, cards, modals, tab bar. |
| `surfaceMuted` | Sunken fills: icon wells, inputs on white, secondary buttons, tracks. |
| `border` | Hairlines (`StyleSheet.hairlineWidth`) and dividers. |
| `text` / `textSecondary` / `textTertiary` | Primary text / supporting text / quiet labels. |
| `accentStrong` | Primary buttons, selected chips and segments, checked marks, the "Ekle" tab. |
| `accentText` | Small accent text: links ("Tümü ›"), active tab, step numbers. |
| `accentSoft` | Fill of a selected answer card. |
| `accent` | Progress fills, small marks (dots, timeline). |
| `peach` / `peachSoft` | Photo placeholders, initials avatars and the personal/AI note card only. |
| `ink` / `onInk` | Toasts, the user's chat bubbles, the `dark` button. |
| `success` / `warning` / `danger` (+`Soft`) | Status only (done, estimated, error, delete). |

Icon wells are `surfaceMuted` with a `text`-colored glyph. Do not tint wells or glyphs with the
accent or status colors unless the state itself is the message (e.g. a failed job).

## Type (`Text` variants, Plus Jakarta Sans only)

`display` 28 bold (screen/recipe titles) · `title` 22 · `title2` 18 (section titles) · `title3` 16
(card titles) · `headline` 15 semibold (row titles, buttons) · `body` 15 · `callout` 14 · `subhead`
13 · `footnote` 12 · `caption` 11 · `overline` 11 bold spaced capitals (always pass `upperTr()`) ·
`numeral` 40 tabular (timers, step numbers). Never set `fontFamily` by hand except `Fonts.regular`
on `TextInput`; never italic.

## Icons

Only `Icon` from `@/components/ui/icon` (Ionicons, outline glyphs; filled only for small status
marks like `checkmark-circle`). No MaterialCommunityIcons, no emoji. At most one icon per row,
chip or button. Chips are text-only (except × to remove / ✓ when picked). Section titles have no
icons. The Home category tiles are the one place categories get an icon (`categoryIcon()`), in a
white well on a `surfaceMuted` tile.

## Shape and spacing

Radius: `sm` 8 tags · `md` 14 inputs/tiles · `lg` 18 cards/lists · `xl` 24 photo cards ·
`sheet` 28 sheet tops · `pill` buttons, chips, search, segmented control.
Spacing: screen padding 20 · gap between sections 28 · inside a section 12 · card padding 16.

## Layouts

| Screen kind | Layout |
| --- | --- |
| Tab screens, pushed list screens | Page-colored header (`SheetHeader` in a scroll view, or `SheetLayout` around a list) above a white sheet with a 28 pt rounded top. |
| Modals (add, assistant, create, edit) | White `surface` page, `ScreenHeader leading="close" tone="muted"`, optional `StickyFooter`. |
| Wizards (chef, onboarding questions) | `WizardLayout`: flow name, "Adım x/y", progress bar, one question, Geri / Devam footer. |
| Recipe detail, cooking | Full-bleed photo/video, then a white sheet rising over it with a 28 pt rounded top. |

## Building blocks (`src/components/ui`)

`Button` (primary · dark · secondary · outline · ghost · danger; sizes lg 52 / md 44 / sm 36) ·
`IconButton` (surface · muted · overlay · accent) · `Chip`, `ChipRow`, `ChipWrap` ·
`SegmentedControl` · `SearchField` · `TextField` · `ListGroup` + `ListRow` · `Card` (surface · muted
· warm) · `ChoiceCard` (radio · checkbox · button, `compact` tiles) · `Tag` · `ProgressBar` ·
`Stepper` · `EmptyState` / `ErrorState` / `LoadingState` · `SkeletonPulse` + `SkeletonBlock` ·
`ScreenHeader` · `SheetHeader` / `SheetLayout` / `StickyFooter` · `WizardLayout` · `Avatar` ·
`PressableScale`. Recipe placeholders: `PlateMark` / `DishPlaceholder` / `AiHero`
(`src/components/recipe/ai-hero.tsx`).

## Motion and feedback

Short and functional: 200–280 ms fades/slides between steps, a spring on press
(`PressableScale`), `Haptics.selectionAsync()` on choices and `notificationAsync` on success/error.
No looping decoration except progress while waiting.
