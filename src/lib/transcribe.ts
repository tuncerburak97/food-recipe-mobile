import { Platform } from 'react-native';

import { request } from '@/lib/api';

/** One stretch of speech, in seconds from the start of the recording. */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

/** What the backend heard (POST /api/v1/voice/transcribe). */
export interface Transcript {
  text: string;
  language?: string;
  duration_sec?: number;
  segments: TranscriptSegment[];
}

interface Options {
  /** ISO 639-1 hint, default "tr". */
  language?: string;
  /** Words to expect (dish and ingredient names) for better accuracy. */
  prompt?: string;
  /** Default audio/m4a (what expo-audio records on iOS and Android). */
  mimeType?: string;
  timeoutMs?: number;
}

/**
 * Appends a local recording to a multipart form as `field`. On native the file is sent by its URI;
 * on web the recording is a blob: URL, so it is read into a Blob first.
 */
export async function appendFile(form: FormData, field: string, uri: string, name: string, type: string) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, name);
    return;
  }
  // React Native's FormData takes { uri, name, type } for files.
  form.append(field, { uri, name, type } as unknown as Blob);
}

/** Sends a recording to the backend's speech to text and returns the text with timestamps. */
export async function transcribeAudio(uri: string, opts: Options = {}): Promise<Transcript> {
  const type = opts.mimeType ?? 'audio/m4a';
  const ext = type.split('/')[1]?.replace('x-', '') || 'm4a';
  const form = new FormData();
  await appendFile(form, 'audio', uri, `voice.${ext}`, type);
  form.append('language', opts.language ?? 'tr');
  if (opts.prompt) form.append('prompt', opts.prompt);
  return request<Transcript>('/api/v1/voice/transcribe', { method: 'POST', body: form }, opts.timeoutMs ?? 60_000);
}
