import { listen } from '@tauri-apps/api/event';
import type { SubtitleEvent } from './types';

type EventHandler = (event: SubtitleEvent) => void;

const handlers = new Set<EventHandler>();
let started = false;

export function onSubtitleEvent(handler: EventHandler): () => void {
  handlers.add(handler);
  void ensureListening();
  return () => handlers.delete(handler);
}

async function ensureListening(): Promise<void> {
  if (started) {
    return;
  }
  started = true;
  await listen<SubtitleEvent>('subtitle-event', (payload) => {
    for (const handler of handlers) {
      handler(payload.payload);
    }
  });
}

export async function getServerStatus(): Promise<{ running: boolean; port: number }> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('get_server_status');
}

export async function showSettingsWindow(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('show_settings_window');
}

export async function hideCaptionWindow(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('hide_caption_window');
}

export async function showCaptionWindow(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('show_caption_window');
}
