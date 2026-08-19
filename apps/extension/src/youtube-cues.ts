import type { SubtitleCue } from './types';

interface YoutubeTimedTextEvent {
  tStartMs?: number;
  dDurationMs?: number;
  dDurMs?: number;
  segs?: Array<{ utf8?: string }>;
}

interface YoutubeTimedTextPayload {
  events?: YoutubeTimedTextEvent[];
}

export function parseYoutubeTimedText(data: unknown): SubtitleCue[] {
  const payload = data as YoutubeTimedTextPayload;
  if (!payload?.events) {
    return [];
  }

  const cues: SubtitleCue[] = [];
  for (const event of payload.events) {
    if (!event.segs) {
      continue;
    }

    const text = event.segs
      .map((segment) => segment.utf8 ?? '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      continue;
    }

    const startMs = event.tStartMs ?? 0;
    const durationMs = event.dDurationMs ?? event.dDurMs ?? 3000;
    cues.push({
      startMs,
      endMs: startMs + durationMs,
      text,
    });
  }

  return cues;
}
