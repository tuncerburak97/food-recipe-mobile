import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

import { API_BASE_URL, ApiError, authHeaders, toEntry } from '@/lib/api';
import type { AgentAction, AgentBlock, AgentEvent, AgentHistoryTurn, AgentStep } from '@/lib/agent/types';
import type { ApiEntry, Creator } from '@/lib/types';

/** The server pings every 15 s; no byte for this long means the connection dropped. */
const IDLE_MS = 45_000;

type SseEvent = { event: string; data: string };

/** Incremental text/event-stream parser: feed chunks as they arrive, get complete events back. */
export function createSseParser() {
  let buffer = '';
  let event = 'message';
  let data: string[] = [];
  return function feed(chunk: string): SseEvent[] {
    buffer += chunk;
    const out: SseEvent[] = [];
    let nl = buffer.search(/\r?\n/);
    while (nl >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(buffer[nl] === '\r' ? nl + 2 : nl + 1);
      if (line === '') {
        if (data.length > 0) out.push({ event, data: data.join('\n') });
        event = 'message';
        data = [];
      } else if (!line.startsWith(':')) {
        const i = line.indexOf(':');
        const field = i < 0 ? line : line.slice(0, i);
        const value = i < 0 ? '' : line.slice(i + 1).replace(/^ /, '');
        if (field === 'event') event = value;
        else if (field === 'data') data.push(value);
      }
      nl = buffer.search(/\r?\n/);
    }
    return out;
  };
}

type RawBlock = { id: string; type: string; title?: string; recipes?: { entry: ApiEntry; missing?: string[]; partial?: boolean }[]; creators?: Creator[] };

function toBlock(b: RawBlock): AgentBlock | null {
  if (b.type === 'recipes') {
    return {
      id: b.id,
      type: 'recipes',
      title: b.title,
      recipes: (b.recipes ?? []).map((r) => ({ entry: toEntry(r.entry), missing: r.missing, partial: r.partial })),
    };
  }
  if (b.type === 'creators') return { id: b.id, type: 'creators', title: b.title, creators: b.creators ?? [] };
  return null;
}

/** Turns one SSE frame into an app event; unknown events are dropped. */
export function toAgentEvent(name: string, raw: string): AgentEvent | null {
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  switch (name) {
    case 'status':
      return { type: 'status', label: String(d.label ?? '') };
    case 'step':
      return { type: 'step', step: d as unknown as AgentStep };
    case 'delta':
      return { type: 'delta', text: String(d.text ?? '') };
    case 'reset':
      return { type: 'reset' };
    case 'block': {
      const block = toBlock(d as unknown as RawBlock);
      return block ? { type: 'block', block } : null;
    }
    case 'action':
      return { type: 'action', action: d as unknown as AgentAction };
    case 'done':
      return { type: 'done', ms: Number(d.ms ?? 0) };
    case 'error':
      return { type: 'error', code: String(d.code ?? 'AGENT_ERROR'), message: String(d.message ?? 'Şu an cevap veremedim, tekrar dene.') };
  }
  return null;
}

type StreamBody = { getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }>; cancel?: () => Promise<void> } };

const platformFetch: (url: string, init: RequestInit) => Promise<Response> =
  Platform.OS === 'web' ? globalThis.fetch.bind(globalThis) : (expoFetch as unknown as (url: string, init: RequestInit) => Promise<Response>);

/**
 * POST /api/v1/agent/chat as a live stream. Calls onEvent for every event; resolves when the stream
 * ends. Throws ApiError for HTTP errors, a dropped connection ('NETWORK_ERROR') or stop ('CANCELLED').
 */
export async function streamAgent(messages: AgentHistoryTurn[], onEvent: (e: AgentEvent) => void, signal: AbortSignal): Promise<void> {
  const inner = new AbortController();
  const abort = () => inner.abort();
  signal.addEventListener('abort', abort);
  let idle = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      idle = true;
      inner.abort();
    }, IDLE_MS);
  };
  try {
    arm();
    const res = await platformFetch(`${API_BASE_URL}/api/v1/agent/chat`, {
      method: 'POST',
      headers: { ...authHeaders(), Accept: 'text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: inner.signal,
    });
    if (!res.ok) {
      let body: { error?: { code: string; message: string } } | null = null;
      try {
        body = await res.json();
      } catch {
        // not JSON
      }
      throw new ApiError(body?.error?.code ?? 'AGENT_ERROR', body?.error?.message ?? 'Asistan şu an cevap veremedi', res.status);
    }
    const feed = createSseParser();
    const decoder = new TextDecoder();
    const emit = (chunk: string) => {
      for (const sse of feed(chunk)) {
        const event = toAgentEvent(sse.event, sse.data);
        if (event) onEvent(event);
      }
    };
    const reader = (res.body as unknown as StreamBody | null)?.getReader();
    if (!reader) {
      emit(`${await res.text()}\n\n`);
      return;
    }
    for (;;) {
      arm();
      const { done, value } = await reader.read();
      if (done) break;
      if (value) emit(decoder.decode(value, { stream: true }));
    }
    emit(`${decoder.decode()}\n\n`);
  } catch (e) {
    if (signal.aborted) throw new ApiError('CANCELLED', 'Durduruldu');
    if (idle) throw new ApiError('NETWORK_ERROR', 'Bağlantı koptu');
    if (e instanceof ApiError) throw e;
    throw new ApiError('NETWORK_ERROR', `Sunucuya ulaşılamadı (${API_BASE_URL})`);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
