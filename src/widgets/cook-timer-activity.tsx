import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/** Plain, serializable props sent from the app (dates as ms timestamps). */
export type CookTimerProps = {
  /** "Adım 3: Sosu kısık ateşte pişir" */
  title: string;
  /** Recipe title, plus "+1 zamanlayıcı daha" when several run. */
  subtitle: string;
  startedAt: number;
  endsAt: number;
  /** Set while paused: the countdown is shown frozen at this moment. */
  pausedAt?: number;
  done?: boolean;
};

/**
 * The cooking timer on the lock screen and the Dynamic Island. iOS draws the countdown itself from
 * the dates, so it keeps running with the app closed. Runs in the widget runtime: no hooks, no
 * imports beyond @expo/ui, nothing referenced from outside this function.
 */
function CookTimerActivity(props: CookTimerProps, environment: LiveActivityEnvironment) {
  'widget';
  const light = '#FAF8F4';
  const muted = '#BDB5AB';
  const accent = '#D46B47';
  const range = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };
  const pauseTime = props.pausedAt ? new Date(props.pausedAt) : undefined;
  const dim = environment.isLuminanceReduced === true;
  // Past its end time with the app closed: say so instead of a clock stuck at 0:00.
  const done = props.done === true || (!pauseTime && environment.isStale === true);

  const clock = (size: number) =>
    done ? (
      <Text modifiers={[font({ size: size * 0.7, weight: 'semibold' }), foregroundStyle(accent)]}>Süre doldu</Text>
    ) : (
      <Text
        timerInterval={range}
        countsDown
        pauseTime={pauseTime}
        modifiers={[font({ size, weight: 'semibold', design: 'serif' }), monospacedDigit(), foregroundStyle(dim ? muted : light)]}
      />
    );

  const labels = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(light), lineLimit(2)]}>
        {pauseTime ? `Duraklatıldı · ${props.title}` : props.title}
      </Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(muted), lineLimit(1)]}>{props.subtitle}</Text>
    </VStack>
  );

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={12}>
          {labels}
          <Spacer />
          {clock(30)}
        </HStack>
        {done || pauseTime ? null : <ProgressView timerInterval={range} modifiers={[tint(accent)]} />}
      </VStack>
    ),
    compactLeading: <Image systemName="timer" modifiers={[foregroundStyle(accent)]} />,
    compactTrailing: clock(15),
    minimal: <Image systemName="timer" modifiers={[foregroundStyle(accent)]} />,
    expandedLeading: <Image systemName="timer" modifiers={[foregroundStyle(accent), padding({ leading: 4 })]} />,
    expandedTrailing: clock(26),
    expandedBottom: labels,
  };
}

export default createLiveActivity<CookTimerProps>('CookTimer', CookTimerActivity);
