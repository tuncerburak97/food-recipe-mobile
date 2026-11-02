import type { Step } from '@/lib/types';

/** The part of the reel that shows one step, in seconds. */
export interface StepClip {
  start: number;
  end: number;
}

/** The step's moment in the video, or null when the recipe does not know it. */
export function stepClip(step: Step | undefined): StepClip | null {
  const start = step?.video_start_sec;
  const end = step?.video_end_sec;
  if (start == null || end == null || !(end > start)) return null;
  return { start, end };
}
