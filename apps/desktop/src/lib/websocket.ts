import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { SubtitleEvent } from './types';

export interface ExtensionInstallInfo {
  path: string;
  exists: boolean;
  buildCommand: string;
}

type EventHandler = (event: SubtitleEvent) => void;

const handlers = new Set<EventHandler>();
let started = false;

void ensureListening();

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
  return invoke('get_server_status');
}

export async function getExtensionInstallInfo(): Promise<ExtensionInstallInfo> {
  const info = await invoke<{
    path: string;
    exists: boolean;
    build_command: string;
  }>('get_extension_install_info');
  return {
    path: info.path,
    exists: info.exists,
    buildCommand: info.build_command,
  };
}

export async function revealExtensionFolder(): Promise<string> {
  return invoke('reveal_extension_folder');
}

export async function openBrowserExtensionsPage(): Promise<void> {
  await invoke('open_browser_extensions_page');
}

export async function showSettingsWindow(): Promise<void> {
  await invoke('show_settings_window');
}

export async function hideCaptionWindow(): Promise<void> {
  await invoke('hide_caption_window');
}

export async function showCaptionWindow(): Promise<void> {
  await invoke('show_caption_window');
}
