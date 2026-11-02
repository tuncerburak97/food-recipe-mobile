import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { AudioSource } from 'expo-audio';
import { Platform } from 'react-native';

import { ApiError, authHeaders, request } from '@/lib/api';
import { appendFile } from '@/lib/transcribe';
import type { ApiErrorBody } from '@/lib/types';

/** Quick answers to "Kim anlatıyor?". */
export const TELLERS = ['Annem', 'Anneannem', 'Babaannem', 'Ben'] as const;

/** Shorter recordings rarely hold a whole recipe. */
export const MIN_RECORDING_SEC = 8;
/** About 7 MB at the recording bitrate, well under the 25 MB upload limit. */
export const MAX_RECORDING_SEC = 20 * 60;

/** A recording being turned into a recipe (recipe-backend internal/store/voice.go VoiceJob). */
export interface VoiceJob {
  id: string;
  status: 'pending' | 'done' | 'failed';
  /** Set while pending. */
  stage: 'transcribing' | 'structuring' | null;
  teller: string | null;
  title: string | null;
  duration_sec: number | null;
  entry_id: number | null;
  error: ApiErrorBody | null;
  created_at: string;
  finished_at: string | null;
}

/** A finished recording on the device. */
export interface Recording {
  uri: string;
  durationSec: number;
  /** Loudness in up to 64 steps (0..1), drawn on the recipe page. */
  waveform: number[];
}

/** A random id for one recording, so sending it again returns the same job. */
export function newClientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** File name and type of a recording: m4a on iOS and Android, whatever the browser made on web. */
async function fileOf(uri: string): Promise<{ name: string; type: string }> {
  if (Platform.OS !== 'web') return { name: 'tarif.m4a', type: 'audio/mp4' };
  const type = (await (await fetch(uri)).blob()).type;
  if (type.includes('mp4') || type.includes('aac')) return { name: 'tarif.m4a', type: 'audio/mp4' };
  if (type.includes('ogg')) return { name: 'tarif.ogg', type: 'audio/ogg' };
  return { name: 'tarif.webm', type: 'audio/webm' };
}

/** Sends a recording. The recipe is prepared in the background: poll the job with useVoiceJob. */
export async function uploadVoiceRecipe(rec: Recording, opts: { teller: string; title: string; clientId: string }): Promise<VoiceJob> {
  const { name, type } = await fileOf(rec.uri);
  const form = new FormData();
  await appendFile(form, 'audio', rec.uri, name, type);
  if (opts.teller) form.append('teller', opts.teller);
  if (opts.title) form.append('title', opts.title);
  form.append('duration_sec', rec.durationSec.toFixed(1));
  if (rec.waveform.length) form.append('waveform', JSON.stringify(rec.waveform.map((v) => Math.round(v * 1000) / 1000)));
  form.append('client_id', opts.clientId);
  return request<VoiceJob>('/api/v1/recipes/from-voice', { method: 'POST', body: form }, 180_000);
}

export function retryVoiceJob(id: string): Promise<VoiceJob> {
  return request<VoiceJob>(`/api/v1/me/voice-recipes/${encodeURIComponent(id)}/retry`, { method: 'POST' }, 20_000);
}

/** The job of a recording, polled while it is being prepared. */
export function useVoiceJob(id: string | null) {
  return useQuery({
    queryKey: ['voice-job', id],
    queryFn: () => request<VoiceJob>(`/api/v1/me/voice-recipes/${encodeURIComponent(id ?? '')}`, { method: 'GET' }, 15_000),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data?.status === 'pending' || q.state.data == null ? 1500 : false),
    refetchIntervalInBackground: true,
  });
}

/** Puts a job the app just received into the cache, so the screen shows it without waiting for a poll. */
export function setVoiceJob(client: QueryClient, job: VoiceJob) {
  client.setQueryData(['voice-job', job.id], job);
}

/**
 * Where to play a stored recording from. Native players send the headers themselves; a browser
 * audio element cannot, so on web the file is fetched first and played from memory.
 */
export async function voiceAudioSource(url: string): Promise<{ source: AudioSource; release?: () => void }> {
  if (Platform.OS !== 'web') return { source: { uri: url, headers: authHeaders() } };
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new ApiError('VOICE_NOT_FOUND', 'Kayıt yüklenemedi', res.status);
  const blobUrl = URL.createObjectURL(await res.blob());
  return { source: { uri: blobUrl }, release: () => URL.revokeObjectURL(blobUrl) };
}

/** Title of the voice memo: "Annem anlatıyor". */
export function tellerTitle(teller?: string | null): string {
  const t = teller?.trim();
  if (!t) return 'Tarifin ses kaydı';
  if (t.toLocaleLowerCase('tr-TR') === 'ben') return 'Kendi sesinden';
  return `${t} anlatıyor`;
}

/** 192 -> "3 dk 12 sn", a recording's length in words. */
export function lengthLabel(sec: number): string {
  const s = Math.max(1, Math.round(sec));
  const m = Math.floor(s / 60);
  if (m === 0) return `${s} sn`;
  return s % 60 ? `${m} dk ${s % 60} sn` : `${m} dk`;
}

/** Reduces loudness samples to `steps` values, keeping the loudest of each stretch. */
export function downsample(samples: number[], steps: number): number[] {
  if (samples.length === 0) return [];
  const n = Math.min(steps, samples.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const from = Math.floor((i * samples.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * samples.length) / n));
    out.push(Math.max(...samples.slice(from, to)));
  }
  return out;
}

/** Recorder metering (dBFS, -160 silence .. 0) to a calm 0..1 level for the meter. */
export function levelOf(db: number | undefined): number {
  if (db == null || !Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, (db + 50) / 44));
}

/** Turkish text for a failed upload or job. */
export function voiceErrorText(err: unknown): { title: string; message: string } {
  const code = err instanceof ApiError ? err.code : 'UNKNOWN';
  switch (code) {
    case 'NETWORK_ERROR':
      return { title: 'İnternet bağlantısı yok', message: 'Kaydın telefonunda duruyor. Bağlantın gelince tekrar dene.' };
    case 'TIMEOUT':
      return { title: 'Kayıt gönderilemedi', message: 'Gönderim çok uzun sürdü. Kaydın telefonunda duruyor, tekrar dene.' };
    case 'STT_NOT_CONFIGURED':
    case 'RECIPE_AGENT_NOT_CONFIGURED':
      return { title: 'Sesli tarif şu an kapalı', message: 'Kaydın telefonunda duruyor. Birazdan tekrar dener misin?' };
    case 'AUDIO_TOO_LARGE':
      return { title: 'Kayıt çok uzun', message: 'Daha kısa bir kayıtla tekrar dener misin?' };
    case 'UNSUPPORTED_AUDIO':
      return { title: 'Kayıt okunamadı', message: 'Bu ses biçimi desteklenmiyor. Yeniden kaydetmeyi dener misin?' };
    case 'AUTH_REQUIRED':
    case 'INVALID_TOKEN':
      return { title: 'Oturum bulunamadı', message: 'Uygulamayı kapatıp açtıktan sonra tekrar dene.' };
    default:
      return { title: 'Bir sorun oldu', message: 'Kaydın telefonunda duruyor. Tekrar dener misin?' };
  }
}
